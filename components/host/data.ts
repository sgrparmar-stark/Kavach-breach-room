'use client';
/* Host dashboard: live data, derived values and facilitator actions. */
import { useEffect, useRef, useState } from 'react';
import { getStore, log, type Json } from '@/lib/store';
import { SCENARIOS, INJECTS } from '@/data/scenarios';
import { MODES, INSIDER_BONUS, fmt, gameById, graph, injectById, type ModeKey, type NodeId } from '@/lib/game';
import { LOG_TEXT } from '@/lib/game';

export type Paths = 'games' | 'teams' | 'control' | 'secrets' | 'log' | 'members' | 'roles' | 'insiders';
export type Data = Record<Paths, Json> & { loaded: boolean };
export interface Team { uid: string; name: string; game: string; joinedAt?: number; codeOk?: string; vote?: string; prog?: Json }

const PATHS: Paths[] = ['games', 'teams', 'control', 'secrets', 'log', 'members', 'roles', 'insiders'];
export const GS_LABEL: Record<string, string> = { closed: 'Closed', open: 'Open', paused: 'Paused', ended: 'Ended' };
export const ST_LABEL: Record<string, string> = { waiting: 'Waiting', playing: 'Playing', paused: 'Paused', finished: 'Finished', stopped: 'Stopped', new: 'Joining' };

/** Subscribes to everything the host needs and runs the background chores (launch codes, room codes, late Insider roles). */
export function useConsoleData(): Data {
  const [D, setD] = useState<Data>(() => ({ games: {}, teams: {}, control: {}, secrets: {}, log: {}, members: {}, roles: {}, insiders: {}, loaded: false }));
  const seen = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const store = getStore();
    const offs = PATHS.map((k) => store.on(k, (v) => {
      seen.current[k] = true;
      setD((d) => ({ ...d, [k]: v || {}, loaded: PATHS.every((p) => seen.current[p]) }));
    }));
    return () => offs.forEach((o) => o());
  }, []);
  // background chores, each only once the data they depend on has loaded
  const issuing = useRef<Record<string, boolean>>({});
  useEffect(() => { if (D.loaded) issueCodes(D, issuing.current); }, [D]);
  useEffect(() => { if (D.loaded) lateLoyals(D); }, [D]);
  const rooming = useRef<Record<string, boolean>>({});
  useEffect(() => { if (D.loaded) ensureRooms(D, rooming.current); }, [D]);
  return D;
}

/* ---------- derived values ---------- */
export const G = (D: Data, gid: string): Json => D.games[gid] || { state: 'closed', mode: 'std' };
export const prog = (t: Team): Json => t.prog || {};
export const ctlOf = (D: Data, uid: string): Json => D.control[uid] || {};
export function teamsOf(D: Data, gid: string | 'all'): Team[] {
  return Object.keys(D.teams).map((u) => ({ uid: u, ...D.teams[u] }) as Team)
    .filter((t) => t.name && (gid === 'all' || t.game === gid))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}
export function finalOf(D: Data, t: Team): number {
  const q = prog(t);
  if (q.finalBase != null) return q.finalBase + (ctlOf(D, t.uid).adj || 0);
  return q.finalTime || 0;
}
export function tStatus(D: Data, t: Team): string {
  const p = prog(t), c = ctlOf(D, t.uid);
  if (p.status === 'finished') return p.outcomeKey === 'stopped' ? 'stopped' : 'finished';
  if (p.status === 'playing' && (c.pause || G(D, t.game).state === 'paused')) return 'paused';
  return p.status || 'waiting';
}
export function liveTime(D: Data, t: Team, now: number): number {
  const p = prog(t), c = ctlOf(D, t.uid);
  if (p.status === 'finished') return finalOf(D, t);
  if (!p.startedAt) return 0;
  let base = (p.raw || 0) + (p.pen || 0) + (c.adj || 0);
  if (p.status === 'playing' && G(D, t.game).state !== 'paused' && !c.pause) {
    const from = Math.max(p.at || now, p.frozenUntil || 0);
    base += Math.max(0, Math.floor((now - from) / 1000));
  }
  return base;
}
export function counts(D: Data, gid: string | 'all') {
  const c: Record<string, number> = { waiting: 0, playing: 0, paused: 0, finished: 0, stopped: 0, new: 0, total: 0 };
  teamsOf(D, gid).forEach((t) => { const s = tStatus(D, t); c[s] = (c[s] || 0) + 1; c.total++; });
  return c;
}
/** Finished teams, best first. Teams stopped before closing the case rank below every team that finished. */
export function ranked(D: Data, gid: string | 'all'): Team[] {
  return teamsOf(D, gid).filter((t) => prog(t).status === 'finished').sort((a, b) => {
    const ca = prog(a).outcomeKey === 'stopped' ? 1 : 0, cb = prog(b).outcomeKey === 'stopped' ? 1 : 0;
    if (ca !== cb) return ca - cb;
    if (ca) return (prog(b).solved || 0) - (prog(a).solved || 0) || finalOf(D, a) - finalOf(D, b);
    return finalOf(D, a) - finalOf(D, b);
  });
}
/** Everyone in the game, in race order: finished, then furthest along, then fastest. */
export function raceOrder(D: Data, gid: string | 'all', now: number): Team[] {
  const rank = (t: Team) => { const s = tStatus(D, t); return s === 'finished' ? 0 : s === 'stopped' ? 2 : s === 'playing' || s === 'paused' ? 1 : 3; };
  const fin = ranked(D, gid);
  return teamsOf(D, gid).sort((a, b) => {
    const ra = rank(a), rb = rank(b); if (ra !== rb) return ra - rb;
    if (ra === 0 || ra === 2) return fin.indexOf(a) - fin.indexOf(b);
    return (prog(b).solved || 0) - (prog(a).solved || 0) || liveTime(D, a, now) - liveTime(D, b, now);
  });
}
export function seatsOf(D: Data, uid: string): { uid: string; seat: string }[] {
  const m = D.members[uid] || {};
  return Object.keys(m).filter((k) => k !== 'meta' && m[k] && m[k].seat).map((k) => ({ uid: k, seat: m[k].seat }));
}
export function logRows(D: Data): Json[] {
  return Object.keys(D.log).map((k) => D.log[k]).filter(Boolean).sort((a: Json, b: Json) => a.at - b.at);
}

/* ---------- chores ---------- */
function issueCodes(D: Data, issuing: Record<string, boolean>) {
  const store = getStore();
  const used: Record<string, boolean> = {};
  Object.values(D.secrets as Record<string, Json>).forEach((s) => { if (s && s.code) used[s.code] = true; });
  Object.keys(D.teams).forEach((u) => {
    if ((D.secrets[u] && D.secrets[u].code) || issuing[u] || !D.teams[u]?.name) return;
    let c: string; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (used[c]);
    used[c] = true; issuing[u] = true;
    void store.set('secrets/' + u + '/code', c).then(() => { delete issuing[u]; void log('fac_code', 'Code ' + c, { uid: u, team: D.teams[u]?.name, game: D.teams[u]?.game }); }, () => { delete issuing[u]; });
  });
}
function lateLoyals(D: Data) {
  Object.keys(D.insiders).forEach((team) => {
    const ins = D.insiders[team];
    seatsOf(D, team).forEach((x) => { if (!D.roles[x.uid] && x.uid !== ins?.member) void getStore().set('roles/' + x.uid, { role: 'loyal', team }); });
  });
}
function ensureRooms(D: Data, rooming: Record<string, boolean>) {
  const used: Record<string, boolean> = {};
  SCENARIOS.forEach((s) => { const r = D.games[s.id]?.room; if (r) used[r] = true; });
  SCENARIOS.forEach((s) => {
    if (D.games[s.id]?.room || rooming[s.id]) return;
    rooming[s.id] = true;
    let c: string; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (used[c]);
    used[c] = true;
    const store = getStore();
    void store.update('games/' + s.id, { room: c }).then(() => store.set('rooms/' + c, s.id));
  });
}

/* ---------- actions ---------- */
const who = (t: Team) => ({ uid: t.uid, team: t.name, game: t.game });
export function setGameState(D: Data, gid: string, state: string) {
  const g = G(D, gid);
  void getStore().update('games/' + gid, { state, mode: g.mode || 'std', at: getStore().now() });
  void log('game_state', gameById(gid)?.title + ' → ' + GS_LABEL[state], { game: gid });
}
export function setMode(D: Data, gid: string, mode: ModeKey) {
  void getStore().update('games/' + gid, { mode, state: G(D, gid).state || 'closed', at: getStore().now() });
  void log('game_mode', gameById(gid)?.title + ' → ' + MODES[mode].label, { game: gid });
}
export function setInsider(D: Data, gid: string, on: boolean) {
  void getStore().update('games/' + gid, { insider: on, state: G(D, gid).state || 'closed', mode: G(D, gid).mode || 'std', at: getStore().now() });
  void log('game_mode', gameById(gid)?.title + ' → Insider round ' + (on ? 'on' : 'off'), { game: gid });
}
export function newRoomCode(D: Data, gid: string) {
  const store = getStore(), old = G(D, gid).room;
  const used: Record<string, boolean> = {};
  SCENARIOS.forEach((s) => { const r = D.games[s.id]?.room; if (r) used[r] = true; });
  let c: string; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (used[c]);
  if (old) void store.remove('rooms/' + old);
  void store.update('games/' + gid, { room: c }).then(() => store.set('rooms/' + c, gid));
  void log('room', gameById(gid)?.title + ' → room ' + c, { game: gid });
}
export function launch(t: Team) { void getStore().update('control/' + t.uid, { launch: getStore().now() }); void log('fac_launch', '', who(t)); }
export function startAll(D: Data, gid: string): number {
  let n = 0;
  teamsOf(D, gid).forEach((t) => { if ((prog(t).status || 'waiting') === 'waiting') { launch(t); n++; } });
  return n;
}
export type TeamCmd = 'launch' | 'pause' | 'adj' | 'hint' | 'msg' | 'inject' | 'jump' | 'end' | 'remove' | 'newcode';
export function teamCmd(D: Data, uid: string, cmd: TeamCmd, arg?: string | number) {
  const store = getStore();
  const t: Team = { uid, ...(D.teams[uid] || {}) }, c = ctlOf(D, uid), now = store.now();
  switch (cmd) {
    case 'launch': launch(t); break;
    case 'pause': void store.update('control/' + uid, { pause: !c.pause }); void log(c.pause ? 'fac_resume' : 'fac_pause', '', who(t)); break;
    case 'adj': {
      const d = Number(arg) || 0, a = (c.adj || 0) + d;
      void store.update('control/' + uid, { adj: a });
      void log('fac_adj', (d > 0 ? '+' : '') + d + 's (total ' + (a > 0 ? '+' : '') + a + 's)', who(t)); break;
    }
    case 'hint': void store.update('control/' + uid, { hint: { at: now } }); void log('fac_hint', prog(t).nodeName || '', who(t)); break;
    case 'msg': if (!arg) return; void store.update('control/' + uid, { msg: { text: String(arg), at: now } }); void log('fac_msg', String(arg), who(t)); break;
    case 'inject': void store.update('control/' + uid, { inject: { id: String(arg), at: now } }); void log('fac_inject', injectById(String(arg))?.name || '', who(t)); break;
    case 'jump': void store.update('control/' + uid, { jump: { node: String(arg), at: now } }); void log('fac_jump', graph(t.game)[String(arg) as NodeId]?.label || '', who(t)); break;
    case 'end': void store.update('control/' + uid, { end: { at: now } }); void log('fac_end', '', who(t)); break;
    case 'remove':
      seatsOf(D, uid).forEach((x) => { void store.remove('roles/' + x.uid); });
      void store.remove('members/' + uid); void store.remove('insiders/' + uid);
      void store.remove('teams/' + uid); void store.remove('control/' + uid); void store.remove('secrets/' + uid);
      void log('fac_remove', t.name || '', who(t)); break;
    case 'newcode': void store.remove('secrets/' + uid); break;
  }
}
export function broadcast(D: Data, gid: string, text: string): number {
  let n = 0;
  teamsOf(D, gid).forEach((t) => { if (tStatus(D, t) !== 'finished') { teamCmd(D, t.uid, 'msg', text); n++; } });
  return n;
}
export function injectAll(D: Data, gid: string, id: string): number {
  let n = 0;
  teamsOf(D, gid).forEach((t) => { const s = tStatus(D, t); if (s === 'playing' || s === 'paused') { teamCmd(D, t.uid, 'inject', id); n++; } });
  return n;
}
export function resetEvent(D: Data) {
  const store = getStore();
  (['teams', 'control', 'secrets', 'log', 'members', 'roles', 'insiders'] as const).forEach((p) => { void store.remove(p); });
  SCENARIOS.forEach((s) => { const room = G(D, s.id).room; void store.set('games/' + s.id, { state: 'closed', mode: 'std', at: store.now(), ...(room ? { room } : {}) }); });
  setTimeout(() => { void log('reset', 'All teams, codes and logs cleared'); }, 300);
}
export function dealTeam(D: Data, t: Team): 'ok' | 'few' | 'done' {
  if (D.insiders[t.uid]) return 'done';
  const s = seatsOf(D, t.uid); if (s.length < 2) return 'few';
  const pick = s[Math.floor(Math.random() * s.length)];
  const store = getStore();
  void store.set('insiders/' + t.uid, { member: pick.uid, seat: pick.seat, at: store.now() });
  s.forEach((x) => { void store.set('roles/' + x.uid, { role: x.uid === pick.uid ? 'insider' : 'loyal', team: t.uid }); });
  void log('roles_dealt', s.length + ' teammates', who(t));
  return 'ok';
}
export function dealRoles(D: Data, gid: string): { n: number; few: number } {
  let n = 0, few = 0;
  teamsOf(D, gid).forEach((t) => { const r = dealTeam(D, t); if (r === 'ok') n++; if (r === 'few') few++; });
  return { n, few };
}
export function revealInsider(D: Data, t: Team): boolean {
  const ins = D.insiders[t.uid], c = ctlOf(D, t.uid);
  if (!ins || c.reveal) return false;
  const vote = t.vote || '', correct = !!vote && vote === ins.member;
  const voteSeat = vote ? (seatsOf(D, t.uid).find((x) => x.uid === vote)?.seat || '') : '';
  const store = getStore();
  teamCmd(D, t.uid, 'adj', correct ? -INSIDER_BONUS : INSIDER_BONUS);
  void store.update('control/' + t.uid, { reveal: { at: store.now(), seat: ins.seat, correct, voteSeat } });
  seatsOf(D, t.uid).forEach((x) => { void store.update('roles/' + x.uid, { revealed: { seat: ins.seat, correct } }); });
  void log('reveal', 'Insider ' + ins.seat + (correct ? ' caught' : ' escaped') + (voteSeat ? ' (voted ' + voteSeat + ')' : ' (no vote)'), who(t));
  return true;
}
export function revealAll(D: Data, gid: string): number {
  let n = 0;
  teamsOf(D, gid).forEach((t) => { if (prog(t).status === 'finished' && revealInsider(D, t)) n++; });
  return n;
}

/* ---------- exports ---------- */
function csvCell(v: Json) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function csv(rows: Json[][]) { return rows.map((r) => r.map(csvCell).join(',')).join('\n'); }
export function resultsCsv(D: Data): string {
  const rows: Json[][] = [['Rank', 'Team', 'Game', 'Mode', 'Status', 'Outcome', 'Final time', 'Final seconds', 'Clock seconds', 'Wrong', 'Penalty seconds', 'Facilitator adjustment', 'Best streak', 'Ask IT used', '50:50 used', 'Decisions', 'Insider round', 'Insider caught', 'Registered at', 'Started at', 'Finished at']];
  const rk: Record<string, number> = {};
  ranked(D, 'all').forEach((t, i) => { rk[t.uid] = i + 1; });
  teamsOf(D, 'all').sort((a, b) => (rk[a.uid] || 999) - (rk[b.uid] || 999)).forEach((t) => {
    const p = prog(t), c = ctlOf(D, t.uid), fin = p.status === 'finished';
    rows.push([rk[t.uid] || '', t.name, gameById(t.game)?.title || t.game, MODES[(p.mode as ModeKey) || 'std'].label, ST_LABEL[tStatus(D, t)], p.outcome || '',
      fin ? fmt(finalOf(D, t)) : '', fin ? finalOf(D, t) : '', p.raw || '', p.wrong || 0, p.pen || 0, c.adj || 0, p.bestStreak || 0, p.askIt ? 'Yes' : 'No', p.fifty ? 'Yes' : 'No',
      (p.choices || []).map((x: Json) => x.q + ': ' + String(x.label).replace(/<[^>]+>/g, '')).join(' | '), p.insider ? 'Yes' : '', c.reveal ? (c.reveal.correct ? 'Yes' : 'No') : '',
      t.joinedAt ? new Date(t.joinedAt).toLocaleString() : '', p.startedAt ? new Date(p.startedAt).toLocaleString() : '', p.finishedAt ? new Date(p.finishedAt).toLocaleString() : '']);
  });
  return csv(rows);
}
export function logCsv(D: Data): string {
  return csv([['Time', 'Team', 'Game', 'Event', 'Detail']].concat(logRows(D).map((l) => [new Date(l.at).toLocaleString(), l.team, l.game ? gameById(l.game)?.title || l.game : '', LOG_TEXT[l.type] || l.type, l.detail])));
}
export function downloadText(name: string, text: string): boolean {
  try {
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    return true;
  } catch { return false; }
}
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok; } catch { return false; }
  }
}
export { INJECTS };
