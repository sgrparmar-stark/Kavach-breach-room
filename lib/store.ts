/* The data layer. Same paths in both modes:
     event             {reg: open|closed}                                  event-wide registration
     games/{gid}       {state: open|paused|ended, mode: std|x, insider, par, pz:{id:{a,b}}}
     teams/{uid}       {name, joinedAt, codeOk?, vote?, prog:{...}}         written by the team
     assign/{uid}      gid                                                  facilitator only: which game a team plays
     runs/{uid}        {game, startedAt, finishedAt, ev:{id:{t,k,n,o}}}     write-once, server-timed: the official record
     control/{uid}     {launch, pause, pz, adj, adjs, msg, inject, jump, hint, end, reveal} facilitator only
     secrets/{uid}     {code}                                               facilitator only: the team key
     members/{team}    {meta:{name,game}, <memberUid>:{seat}}               Insider round seats
     roles/{member}    {role, team, revealed?}                              Insider round roles
     insiders/{team}   {member, seat}                                       facilitator only
     log/{id}          {at, uid, team, game, type, detail}                  append-only
     sessions/{sid}    archived session (write-once);  sessionsIdx/{sid} {name, at, teams, podium}   */

import { isFirebaseConfigured, createFirebaseStore } from './firebase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export interface Store {
  mode: 'demo' | 'live';
  persistent: boolean;
  uid: string | null;
  lastError?: string;
  init(): Promise<void>;
  signInTeam(): Promise<string>;
  newTeamIdentity(): Promise<void>;
  signInFac(c: { email?: string; password?: string; pin?: string }): Promise<boolean>;
  restoreFac(): Promise<boolean>;
  rememberFac(on: boolean): void;
  signOut(): Promise<void>;
  on(path: string, cb: (v: Json) => void): () => void;
  set(path: string, v: Json): Promise<void>;
  update(path: string, obj: Record<string, Json>): Promise<void>;
  push(path: string, v: Json): Promise<string>;
  remove(path: string): Promise<void>;
  attemptCode(uid: string, code: string): Promise<boolean>;
  now(): number;
  /** A server timestamp placeholder (Firebase) or the local time (demo). */
  ts(): Json;
  onConnected?(cb: (connected: boolean) => void): () => void;
}

export const DEMO_PIN = process.env.NEXT_PUBLIC_DEMO_PIN || '3010';

export function clean<T>(o: T): T { return o == null ? o : JSON.parse(JSON.stringify(o)); }
export function rid(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

/* ---------- browser storage with a memory fallback (some embedded previews block storage) ---------- */
export interface SafeStorage { persistent: boolean; getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; keys(): string[] }
function makeSafeStorage(kind: 'localStorage' | 'sessionStorage'): SafeStorage {
  const mem: Record<string, string> = {};
  let real: Storage | null = null;
  try {
    const s = window[kind]; const k = '__kbr_test';
    s.setItem(k, '1'); if (s.getItem(k) === '1') { s.removeItem(k); real = s; }
  } catch { real = null; }
  return {
    persistent: !!real,
    getItem(k) { if (real) { try { return real.getItem(k); } catch { /* fall through */ } } return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem(k, v) { if (real) { try { real.setItem(k, String(v)); return; } catch { /* fall through */ } } mem[k] = String(v); },
    removeItem(k) { if (real) { try { real.removeItem(k); } catch { /* ignore */ } } delete mem[k]; },
    keys() {
      const out: string[] = [];
      if (real) { try { for (let i = 0; i < real.length; i++) { const k = real.key(i); if (k) out.push(k); } } catch { /* ignore */ } }
      Object.keys(mem).forEach((k) => { if (!out.includes(k)) out.push(k); });
      return out;
    },
  };
}
let _ls: SafeStorage | null = null, _ss: SafeStorage | null = null;
export function LS(): SafeStorage { return (_ls ??= makeSafeStorage('localStorage')); }
export function SS(): SafeStorage { return (_ss ??= makeSafeStorage('sessionStorage')); }
export function lsGet<T = Json>(k: string): T | null { try { const s = LS().getItem(k); return s ? (JSON.parse(s) as T) : null; } catch { return null; } }
export function lsSet(k: string, v: Json): void { try { LS().setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }

/* ---------- demo store: one localStorage entry per record, synced across tabs ---------- */
function parts(p: string): string[] { return String(p).split('/').filter(Boolean); }
function getAt(t: Json, p: string): Json {
  let o = t;
  for (const k of parts(p)) { if (o == null || typeof o !== 'object') return null; o = o[k]; }
  return o === undefined ? null : o;
}
function setAt(t: Json, p: string, v: Json): void {
  const ps = parts(p); let o = t;
  for (let i = 0; i < ps.length - 1; i++) { if (typeof o[ps[i]] !== 'object' || o[ps[i]] === null) o[ps[i]] = {}; o = o[ps[i]]; }
  if (v === null || v === undefined) delete o[ps[ps.length - 1]]; else o[ps[ps.length - 1]] = clean(v);
}

export function createLocalStore(): Store {
  const PFX = 'kbr-db:';
  const listeners: { path: string; cb: (v: Json) => void; last: string | undefined }[] = [];
  const keys = () => LS().keys().filter((k) => k.indexOf(PFX) === 0);
  const read = (): Json => { const t: Json = {}; keys().forEach((k) => { try { setAt(t, k.slice(PFX.length), JSON.parse(LS().getItem(k) as string)); } catch { /* skip */ } }); return t; };
  const writePath = (p: string, v: Json) => {
    const ps = parts(p); if (!ps.length) return;
    if (ps.length === 1) {
      keys().forEach((k) => { if (k.indexOf(PFX + ps[0] + '/') === 0) LS().removeItem(k); });
      if (v && typeof v === 'object') Object.keys(v).forEach((c) => LS().setItem(PFX + ps[0] + '/' + c, JSON.stringify(v[c])));
      return;
    }
    const key = PFX + ps[0] + '/' + ps[1];
    let nv: Json;
    if (ps.length === 2) nv = v;
    else {
      let cur: Json = null; try { cur = JSON.parse(LS().getItem(key) as string); } catch { cur = null; }
      nv = cur && typeof cur === 'object' ? cur : {};
      setAt(nv, ps.slice(2).join('/'), v);
      if (!Object.keys(nv).length) nv = null;
    }
    if (nv === null || nv === undefined) LS().removeItem(key); else LS().setItem(key, JSON.stringify(clean(nv)));
  };
  const notify = () => {
    const t = read();
    listeners.slice().forEach((l) => {
      const v = getAt(t, l.path), s = JSON.stringify(v == null ? null : v);
      if (s !== l.last) { l.last = s; try { l.cb(JSON.parse(s)); } catch (e) { console.error(e); } }
    });
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === null || (e.key && e.key.indexOf(PFX) === 0)) notify(); });

  const store: Store = {
    mode: 'demo',
    persistent: LS().persistent,
    uid: null,
    init: () => Promise.resolve(),
    signInTeam() {
      let u = SS().getItem('kbr-uid');
      if (!u) { u = 't' + rid(); SS().setItem('kbr-uid', u); }
      store.uid = u; return Promise.resolve(u);
    },
    newTeamIdentity() { SS().removeItem('kbr-uid'); return Promise.resolve(); },
    signInFac(c) { return Promise.resolve(String(c.pin || '') === String(DEMO_PIN)); },
    restoreFac() { return Promise.resolve(SS().getItem('kbr-fac') === '1'); },
    rememberFac(on) { if (on) SS().setItem('kbr-fac', '1'); else SS().removeItem('kbr-fac'); },
    signOut() { SS().removeItem('kbr-fac'); return Promise.resolve(); },
    on(path, cb) {
      const l = { path, cb, last: undefined as string | undefined };
      listeners.push(l);
      setTimeout(() => { if (!listeners.includes(l)) return; const v = getAt(read(), path); l.last = JSON.stringify(v == null ? null : v); cb(JSON.parse(l.last)); }, 0);
      return () => { const i = listeners.indexOf(l); if (i > -1) listeners.splice(i, 1); };
    },
    set(p, v) { writePath(p, v); notify(); return Promise.resolve(); },
    update(p, obj) { Object.keys(obj).forEach((k) => writePath(p + '/' + k, obj[k])); notify(); return Promise.resolve(); },
    push(p, v) { const id = rid(); writePath(p + '/' + id, v); notify(); return Promise.resolve(id); },
    remove(p) { writePath(p, null); notify(); return Promise.resolve(); },
    attemptCode(uid, code) {
      const s = getAt(read(), 'secrets/' + uid + '/code');
      if (s && String(s) === String(code)) { writePath('teams/' + uid + '/codeOk', String(code)); notify(); return Promise.resolve(true); }
      return Promise.resolve(false);
    },
    now: () => Date.now(),
    ts: () => Date.now(),
  };
  return store;
}

/* ---------- the shared store, with failed writes reported to whoever is listening ---------- */
let _store: Store | null = null;
let _role: 'host' | 'team' = 'team';
/** Call before the first getStore(): the host dashboard and team screens sign in separately. */
export function setStoreRole(r: 'host' | 'team') { if (!_store) _role = r; }
let writeErrorHandler: ((e: unknown, path: string) => void) | null = null;
export function setWriteErrorHandler(fn: ((e: unknown, path: string) => void) | null) { writeErrorHandler = fn; }

export function getStore(): Store {
  if (_store) return _store;
  const s = isFirebaseConfigured ? createFirebaseStore(_role) : createLocalStore();
  (['set', 'update', 'push', 'remove'] as const).forEach((fn) => {
    const orig = s[fn] as (...a: Json[]) => Promise<Json>;
    (s as Json)[fn] = (...args: Json[]) => {
      let r: Promise<Json>;
      try { r = orig.apply(s, args); } catch (e) { r = Promise.reject(e); }
      return r.catch((e) => { console.warn('Write failed', args[0], e); if (writeErrorHandler) writeErrorHandler(e, String(args[0])); throw e; });
    };
  });
  _store = s;
  return s;
}

export function log(type: string, detail?: string, who?: { uid?: string; team?: string; game?: string }) {
  const s = getStore();
  return s.push('log', { at: s.now(), uid: who?.uid || '', team: who?.team || '', game: who?.game || '', type, detail: detail || '' }).catch(() => undefined);
}
