/* The team's game engine: one instance per phone. Holds the team's progress, talks to the database,
   and reacts to the facilitator's controls. The React screens read from it and call its actions. */
import { getStore, lsGet, lsSet, log, type Json, type Store } from '@/lib/store';
import {
  MODES, ASK_IT_MS, graph, gameById, injectById, nextOf, outcomeOf, fiftyFor, isLockNode, fmt,
  type ModeKey, type NodeId, type GameNode, type Choice, type Outcome,
} from '@/lib/game';
import type { Scenario } from '@/data/scenarios';
import { play, celebrate, unlockAudio } from '@/lib/sound';

export interface Cur {
  sel: string[]; x: string[]; code: string; picks: string[]; seq: string[]; elim: string[];
  choice: string | null; fifty: string[]; fiftyCode: string; wrong: number;
}
export interface TeamState {
  game: string; name: string; registered: boolean; started: boolean; startedAt: number;
  node: NodeId | null; path: NodeId[]; nodeDone: boolean; cur: Cur;
  wrong: number; pen: number; hintNodes: Record<string, 'free' | 'soc'>; pausedMs: number; pauseStart: number;
  choices: Choice[]; handled: Record<string, number>; pendingInject: string | null; injectChoice: string | null;
  finished: boolean; finishedAt: number; finalBase: number; outcome: Outcome | null; endReason: string;
  msg: { text: string; at: number; seen?: boolean } | null; mode: ModeKey; joinedAt: number;
  insider: boolean; vote: string;
  askIt: { node: NodeId; at: number } | null; fiftyUsed: NodeId | null; streak: number; bestStreak: number;
}
export interface GameState { state?: 'closed' | 'open' | 'paused' | 'ended'; mode?: ModeKey; insider?: boolean; room?: string }
export interface Control {
  launch?: number; pause?: boolean; adj?: number; msg?: { text: string; at: number }; inject?: { id: string; at: number };
  jump?: { node: NodeId; at: number }; hint?: { at: number }; end?: { at: number };
  reveal?: { at: number; seat: string; correct: boolean; voteSeat: string };
}
export interface Flash { kind: 'breach' | 'granted' | 'lifeline'; text: string; at: number }

const blankCur = (): Cur => ({ sel: [], x: [], code: '', picks: [], seq: [], elim: [], choice: null, fifty: [], fiftyCode: '', wrong: 0 });
const fresh = (gid: string): TeamState => ({
  game: gid, name: '', registered: false, started: false, startedAt: 0, node: null, path: [], nodeDone: false, cur: blankCur(),
  wrong: 0, pen: 0, hintNodes: {}, pausedMs: 0, pauseStart: 0, choices: [], handled: {}, pendingInject: null, injectChoice: null,
  finished: false, finishedAt: 0, finalBase: 0, outcome: null, endReason: '', msg: null, mode: 'std', joinedAt: 0,
  insider: false, vote: '', askIt: null, fiftyUsed: null, streak: 0, bestStreak: 0,
});

export class TeamEngine {
  readonly gid: string;
  readonly S: Scenario;
  readonly G: Record<NodeId, GameNode>;
  store: Store;
  uid: string | null = null;
  P: TeamState;
  game: GameState = { state: 'closed', mode: 'std' };
  ctl: Control = {};
  members: Json = {};
  loaded = { game: false, ctl: false, team: false };
  fb = { msg: '', type: '' as '' | 'good' | 'bad' };
  busy = false;
  flash: Flash | null = null;
  pop: { text: string; at: number } | null = null;
  shakeId: string | null = null;
  connectError = '';
  private key = '';
  private offs: (() => void)[] = [];
  private membersOff: (() => void) | null = null;
  private lastSync = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTickSec = -1;
  private version = 0;
  private listeners = new Set<() => void>();

  constructor(gid: string) {
    this.gid = gid;
    const s = gameById(gid);
    if (!s) throw new Error('Unknown game');
    this.S = s;
    this.G = graph(gid);
    this.store = getStore();
    this.P = fresh(gid);
  }

  /* ---------- subscription for React ---------- */
  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getVersion = () => this.version;
  private emit() { this.version++; this.listeners.forEach((l) => l()); }

  /* ---------- derived values ---------- */
  M() { return MODES[this.P.mode] || MODES.std; }
  now() { return this.store.now(); }
  node(): GameNode | null { return this.P.node ? this.G[this.P.node] : null; }
  paused() { return this.game?.state === 'paused' || !!this.ctl?.pause; }
  rawMs(): number {
    const P = this.P;
    if (!P.startedAt) return 0;
    const end = P.finished ? P.finishedAt : this.now();
    const pz = P.pausedMs + (P.pauseStart ? end - P.pauseStart : 0);
    const freeze = P.askIt ? Math.min(ASK_IT_MS, Math.max(0, end - P.askIt.at)) : 0;
    return Math.max(0, end - P.startedAt - pz - freeze);
  }
  score(): number { return Math.floor(this.rawMs() / 1000) + this.P.pen + (this.ctl?.adj || 0); }
  freezeLeft(): number { const a = this.P.askIt; if (!a || this.P.finished) return 0; return Math.max(0, ASK_IT_MS - (this.now() - a.at)); }
  status(): string { const P = this.P; return P.finished ? 'finished' : P.started ? (this.paused() ? 'paused' : 'playing') : P.registered ? 'waiting' : 'new'; }
  who() { return { uid: this.uid || '', team: this.P.name, game: this.gid }; }
  seats(): { uid: string; seat: string }[] {
    const m = this.members || {};
    return Object.keys(m).filter((k) => k !== 'meta' && m[k] && m[k].seat).map((k) => ({ uid: k, seat: m[k].seat as string }));
  }
  insiderOn() { return this.P.started ? !!this.P.insider : !!this.game?.insider; }

  /* ---------- persistence ---------- */
  private save() { lsSet(this.key, this.P); }
  sync(force = false) {
    const P = this.P;
    if (!P.registered || !this.uid) return;
    const t = this.now();
    if (!force && t - this.lastSync < 400) return;
    this.lastSync = t;
    const n = this.node();
    void this.store.update('teams/' + this.uid, {
      prog: {
        status: this.status(), node: P.node || '', nodeName: n ? n.label : '', path: P.path, wrong: P.wrong, pen: P.pen,
        elapsed: this.score(), raw: Math.floor(this.rawMs() / 1000), startedAt: P.startedAt, finishedAt: P.finishedAt,
        finalBase: P.finalBase, finalTime: P.finalBase + (this.ctl?.adj || 0), outcome: P.outcome ? P.outcome.label : '', outcomeKey: P.outcome ? P.outcome.key : '',
        endReason: P.endReason, choices: P.choices, pendingInject: P.pendingInject || '', mode: P.mode,
        solved: P.path.filter((x) => x !== P.node || P.nodeDone).length, insider: !!P.insider, vote: P.vote || '',
        streak: P.streak, bestStreak: P.bestStreak, askIt: !!P.askIt, fifty: !!P.fiftyUsed,
        frozenUntil: P.askIt ? P.askIt.at + ASK_IT_MS : 0, paused: this.paused(), at: t,
      },
    }).catch(() => undefined);
  }
  private setFb(msg = '', type: '' | 'good' | 'bad' = '') { this.fb = { msg, type }; }

  /* ---------- lifecycle ---------- */
  async start() {
    try {
      await this.store.init();
      const uid = await this.store.signInTeam();
      this.uid = uid;
      this.key = 'kbr-p-' + this.gid + '-' + uid;
      this.P = { ...fresh(this.gid), ...(lsGet<TeamState>(this.key) || {}) };
      this.P.cur = { ...blankCur(), ...(this.P.cur || {}) };
      this.offs.push(this.store.on('games/' + this.gid, (v) => { this.game = v || { state: 'closed', mode: 'std' }; this.loaded.game = true; this.onGame(); }));
      this.offs.push(this.store.on('control/' + uid, (v) => { this.ctl = v || {}; this.loaded.ctl = true; this.onCtl(); }));
      this.offs.push(this.store.on('teams/' + uid, (v) => {
        const first = !this.loaded.team; this.loaded.team = true;
        if (first && this.P.registered && v === null && !this.P.started) { this.P.registered = false; this.save(); }
        this.onTeam(v);
      }));
      this.timer = setInterval(() => this.tick(), 500);
    } catch (e) {
      this.connectError = (e as Error)?.message || 'Could not connect.';
    }
    this.emit();
  }
  stop() {
    this.offs.forEach((o) => o()); this.offs = [];
    if (this.membersOff) { this.membersOff(); this.membersOff = null; }
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  private tick() {
    if (!this.P.started || this.P.finished) return;
    if (this.now() - this.lastSync > 10_000) this.sync(true);
    const s = this.score(), target = this.M().target;
    if (!this.paused() && !this.freezeLeft() && s >= target - 30 && s < target && s !== this.lastTickSec) { this.lastTickSec = s; play('tick'); }
    this.emit();
  }

  /* ---------- pause accounting ---------- */
  private applyPause() {
    const P = this.P;
    if (!P.started || P.finished) return;
    const pz = this.paused(), t = this.now();
    if (pz && !P.pauseStart) { P.pauseStart = t; this.save(); this.sync(true); }
    if (!pz && P.pauseStart) { P.pausedMs += t - P.pauseStart; P.pauseStart = 0; this.save(); this.sync(true); }
  }

  /* ---------- Insider round: teammates join on their own phones ---------- */
  private watchMembers() {
    if (this.membersOff || !this.P.registered || !this.insiderOn() || !this.uid) return;
    const uid = this.uid;
    void this.store.update('members/' + uid + '/meta', { name: this.P.name, game: this.gid }).catch(() => undefined);
    this.membersOff = this.store.on('members/' + uid, (v) => {
      this.members = v || {};
      if (!this.members.meta || this.members.meta.name !== this.P.name) void this.store.update('members/' + uid + '/meta', { name: this.P.name, game: this.gid }).catch(() => undefined);
      this.emit();
    });
  }

  /* ---------- registration and launch ---------- */
  register(rawName: string) {
    unlockAudio();
    const t = String(rawName).trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!t) { this.setFb('Enter your team name.', 'bad'); this.emit(); return; }
    if (this.game.state !== 'open') { this.setFb('Registration isn’t open yet. Wait for your facilitator.', 'bad'); this.emit(); return; }
    const ctl = this.ctl;
    this.busy = true;
    const P = this.P;
    P.name = t; P.registered = true; P.joinedAt = this.now();
    P.handled = { launch: ctl.launch || 0, inject: ctl.inject?.at || 0, jump: ctl.jump?.at || 0, hint: ctl.hint?.at || 0, end: ctl.end?.at || 0, msg: ctl.msg?.at || 0 };
    this.save(); this.emit();
    this.store.set('teams/' + this.uid, { name: t, game: this.gid, joinedAt: P.joinedAt, prog: { status: 'waiting', at: this.now() } }).then(() => {
      this.busy = false; void log('joined', 'Joined ' + this.S.title, this.who()); this.setFb(); this.watchMembers(); this.emit();
    }, () => {
      this.busy = false; P.registered = false; this.save(); this.setFb('Couldn’t register. Check your connection and try again.', 'bad'); this.emit();
    });
  }
  tryCode(raw: string) {
    unlockAudio();
    const c = String(raw).replace(/\D/g, '');
    if (c.length !== 4) { this.setFb('Enter the 4-digit code from your facilitator.', 'bad'); this.emit(); return; }
    this.busy = true; this.emit();
    void this.store.attemptCode(this.uid as string, c).then((ok) => {
      this.busy = false;
      if (ok) { void log('code_ok', 'Code accepted', this.who()); this.startGame(); }
      else { void log('code_fail', 'Tried ' + c, this.who()); this.setFb('That code isn’t right. Check it with your facilitator.', 'bad'); play('wrong'); this.emit(); }
    });
  }
  private startGame() {
    const P = this.P;
    if (P.started) return;
    P.started = true; P.startedAt = this.now(); P.node = 'L1'; P.path = ['L1']; P.cur = blankCur(); P.nodeDone = false;
    P.mode = this.game.mode === 'x' ? 'x' : 'std'; P.insider = !!this.game.insider;
    this.setFb(); this.save(); this.sync(true); void log('started', MODES[P.mode].label + ' mode', this.who());
    play('launch'); this.emit(); this.scrollTop();
  }
  private goTo(nodeId: NodeId) {
    if (nodeId === 'END') { this.finish('complete'); return; }
    const P = this.P;
    P.node = nodeId; P.path.push(nodeId); P.cur = blankCur(); P.nodeDone = false;
    this.setFb(); this.save(); this.sync(true); this.emit(); this.scrollTop();
  }
  private finish(reason: 'complete' | 'facilitator' | 'game') {
    const P = this.P;
    if (P.finished) return;
    if (P.pauseStart) { P.pausedMs += this.now() - P.pauseStart; P.pauseStart = 0; }
    P.finished = true; P.finishedAt = this.now(); P.endReason = reason; P.pendingInject = null;
    P.finalBase = Math.floor(this.rawMs() / 1000) + P.pen;
    P.outcome = reason === 'complete' ? outcomeOf(P.choices) : { key: 'stopped', label: reason === 'facilitator' ? 'Stopped by facilitator' : 'Game ended before the case was closed' };
    this.save(); this.sync(true);
    void log(reason === 'complete' ? 'finished' : 'stopped', P.outcome.label + ' · ' + fmt(P.finalBase + (this.ctl.adj || 0)), this.who());
    if (reason === 'complete') { play('finish'); void celebrate(); }
    this.emit(); this.scrollTop();
  }
  private scrollTop() { if (typeof window !== 'undefined') window.scrollTo(0, 0); }

  /* ---------- feedback ---------- */
  private wrongAnswer(id?: string) {
    const P = this.P, p = this.M().pen;
    P.pen += p; P.wrong++; P.cur.wrong++; P.streak = 0;
    this.pop = { text: '+' + p + 's', at: Date.now() };
    this.flash = { kind: 'breach', text: '+' + p + ' seconds', at: Date.now() };
    this.shakeId = id || null;
    setTimeout(() => { this.shakeId = null; this.emit(); }, 450);
    play('wrong');
    try { navigator.vibrate?.(180); } catch { /* not supported */ }
    const n = this.node();
    void log('wrong', n ? n.label : '', this.who());
    return p;
  }
  private solved() {
    const P = this.P;
    P.nodeDone = true;
    if (P.cur.wrong === 0) { P.streak++; P.bestStreak = Math.max(P.bestStreak, P.streak); } else P.streak = 0;
    this.flash = { kind: 'granted', text: P.streak >= 2 ? P.streak + ' clean solves in a row' : 'Access granted', at: Date.now() };
    play(P.streak >= 2 ? 'streak' : 'correct');
    this.setFb(); this.save(); this.sync(true);
    const n = this.node(); void log('solved', (n ? n.label : '') + (P.cur.wrong === 0 ? ' · first try' : ''), this.who());
    this.emit();
  }

  /* ---------- facilitator signals ---------- */
  private onCtl() {
    const P = this.P, ctl = this.ctl, h = P.handled || (P.handled = {});
    if (!P.registered) { this.emit(); return; }
    if (ctl.launch && ctl.launch !== h.launch) { h.launch = ctl.launch; this.save(); if (!P.started) { this.startGame(); return; } }
    if (ctl.msg && ctl.msg.at !== h.msg) { h.msg = ctl.msg.at; P.msg = { text: ctl.msg.text, at: ctl.msg.at }; this.save(); play('alert'); }
    if (ctl.end && ctl.end.at !== h.end) { h.end = ctl.end.at; this.save(); if (P.started && !P.finished) { this.finish('facilitator'); return; } }
    if (P.started && !P.finished) {
      if (ctl.inject && ctl.inject.at !== h.inject) { h.inject = ctl.inject.at; if (injectById(ctl.inject.id)) { P.pendingInject = ctl.inject.id; P.injectChoice = null; play('alert'); } this.save(); this.sync(true); }
      if (ctl.jump && ctl.jump.at !== h.jump) { h.jump = ctl.jump.at; this.save(); if (this.G[ctl.jump.node]) { this.goTo(ctl.jump.node); return; } }
      if (ctl.hint && ctl.hint.at !== h.hint) { h.hint = ctl.hint.at; const n = this.node(); if (n && isLockNode(n) && !P.hintNodes[n.id]) P.hintNodes[n.id] = 'free'; this.save(); this.sync(true); }
    } else {
      h.inject = ctl.inject?.at || h.inject; h.jump = ctl.jump?.at || h.jump; h.hint = ctl.hint?.at || h.hint; this.save();
    }
    this.applyPause(); this.sync(true); this.emit();
  }
  private onGame() {
    this.applyPause(); this.watchMembers();
    if (this.game.state === 'ended' && this.P.started && !this.P.finished) { this.finish('game'); return; }
    this.emit();
  }
  private onTeam(rec: Json) {
    const P = this.P;
    if (P.registered && rec === null && this.loaded.team) {
      const keep = P.name; this.P = fresh(this.gid); this.P.name = keep; this.save();
      this.setFb('Your facilitator removed this registration. You can join again.', 'bad'); this.emit(); this.scrollTop(); return;
    }
    if (P.registered && rec && rec.codeOk && !P.started && !P.finished) { this.startGame(); return; }
    this.emit();
  }

  /* ---------- lifelines ---------- */
  canAskIt(): boolean { const n = this.node(); return !!n && isLockNode(n) && !this.P.nodeDone && !this.P.askIt && !this.P.pendingInject; }
  canFifty(): boolean { const n = this.node(); return !!n && isLockNode(n) && !this.P.nodeDone && !this.P.fiftyUsed && !this.P.pendingInject; }
  askIt() {
    if (!this.canAskIt() || this.paused()) return;
    const P = this.P, n = this.node() as GameNode;
    P.askIt = { node: n.id, at: this.now() };
    P.hintNodes[n.id] = 'soc';
    this.flash = { kind: 'lifeline', text: 'Clock frozen for 45 seconds', at: Date.now() };
    play('lifeline');
    void log('askit', n.label, this.who());
    this.save(); this.sync(true); this.emit();
  }
  fifty() {
    if (!this.canFifty() || this.paused()) return;
    const P = this.P, n = this.node();
    if (!n || !isLockNode(n)) return;
    const r = fiftyFor(n, P.cur);
    if (!r) return;
    const c = P.cur;
    c.fifty = r.ids;
    if (n.type === 'pick') c.picks = c.picks.filter((id) => !r.ids.includes(id));
    if (n.type === 'order' && r.seq) c.seq = r.seq.slice();
    if (n.type === 'code' && r.codePrefix != null) { c.code = r.codePrefix; c.fiftyCode = r.codePrefix; }
    P.fiftyUsed = n.id;
    this.flash = { kind: 'lifeline', text: '50:50 used', at: Date.now() };
    play('lifeline');
    void log('fifty', n.label, this.who());
    this.save(); this.sync(true); this.emit();
  }

  /* ---------- player actions ---------- */
  act(a: string, v?: string) {
    const P = this.P;
    if (P.started && !P.finished && this.paused() && a !== 'msgok') return;
    unlockAudio();
    const n = this.node(), c = P.cur;
    switch (a) {
      case 'msgok': if (P.msg) P.msg.seen = true; this.save(); this.emit(); return;
      case 'vote': {
        if (P.vote || !P.finished || !v) return;
        P.vote = v; const vs = this.seats().find((x) => x.uid === v);
        void this.store.update('teams/' + this.uid, { vote: v }); void log('vote', 'Voted ' + (vs ? vs.seat : v), this.who());
        this.save(); this.sync(true); this.emit(); return;
      }
      case 'leave': void this.store.remove('teams/' + this.uid); this.P = fresh(this.gid); this.save(); this.emit(); this.scrollTop(); return;
      case 'dec': {
        if (!n || n.type !== 'decision' || c.choice || !v) return;
        const d = n.options.find((x) => x.id === v); if (!d) return;
        c.choice = v; P.pen += d.pen || 0; if (d.pen) this.pop = { text: '+' + d.pen + 's', at: Date.now() };
        play(d.q === 'best' ? 'correct' : 'wrong');
        P.choices.push({ node: 'D', id: v, q: d.q, label: n.name + ': ' + d.text });
        void log('decision', d.q.toUpperCase() + ' · ' + d.text, this.who()); this.save(); this.sync(true); this.emit(); return;
      }
      case 'inj': {
        if (P.injectChoice || !v) return;
        const I = injectById(P.pendingInject); if (!I) return;
        const io = I.options.find((x) => x.id === v); if (!io) return;
        P.injectChoice = v; P.pen += io.pen || 0; if (io.pen) this.pop = { text: '+' + io.pen + 's', at: Date.now() };
        play(io.q === 'best' ? 'correct' : 'wrong');
        P.choices.push({ node: 'inject:' + I.id, id: v, q: io.q, label: I.name + ': ' + io.text });
        void log('inject_answer', I.name + ' · ' + io.q.toUpperCase(), this.who()); this.save(); this.sync(true); this.emit(); return;
      }
      case 'injdone': P.pendingInject = null; P.injectChoice = null; this.save(); this.sync(true); this.emit(); this.scrollTop(); return;
      case 'next': {
        if (!n) return;
        if (n.type === 'decision') { const dq = n.options.find((x) => x.id === c.choice); if (!dq) return; this.goTo(nextOf(this.gid, n.id, dq.q)); return; }
        if (!P.nodeDone) return;
        this.goTo(nextOf(this.gid, n.id)); return;
      }
    }
    if (!n || !isLockNode(n) || P.nodeDone) return;
    switch (a) {
      case 'spot': {
        if (n.type !== 'spot' || !v) return;
        const it = n.items.find((x) => x.id === v);
        if (!it || c.sel.includes(v) || c.x.includes(v) || c.fifty.includes(v)) return;
        const need = n.items.filter((x) => x.flag).length;
        if (it.flag) {
          c.sel.push(v);
          if (c.sel.length === need) { this.solved(); return; }
          this.setFb('Good catch. ' + (need - c.sel.length) + ' to go.', 'good'); play('correct');
        } else { c.x.push(v); const p = this.wrongAnswer(v); this.setFb('That part is normal. +' + p + ' seconds.', 'bad'); }
        break;
      }
      case 'key': if (n.type !== 'code' || !v) return; if (c.code.length < n.answer.length) c.code += v; this.setFb(); break;
      case 'del': if (c.code.length > c.fiftyCode.length) c.code = c.code.slice(0, -1); this.setFb(); break;
      case 'checkcode': {
        if (n.type !== 'code') return;
        if (c.code.length < n.answer.length) { this.setFb('Enter all ' + n.answer.length + ' digits.', 'bad'); break; }
        if (c.code === n.answer) { this.solved(); return; }
        const p = this.wrongAnswer('code'); c.code = c.fiftyCode; this.setFb('Not that one. +' + p + ' seconds.', 'bad'); break;
      }
      case 'pick': {
        if (n.type !== 'pick' || !v || c.fifty.includes(v)) return;
        const need = n.items.filter((x) => x.bad).length, at = c.picks.indexOf(v);
        if (at > -1) { c.picks.splice(at, 1); this.setFb(); }
        else if (c.picks.length < need) { c.picks.push(v); this.setFb(); }
        else this.setFb('You can pick ' + need + '. Untick one to change your mind.', 'bad');
        break;
      }
      case 'checkpick': {
        if (n.type !== 'pick') return;
        const right = c.picks.filter((id) => n.items.find((x) => x.id === id)?.bad).length;
        if (right === c.picks.length) { this.solved(); return; }
        const p = this.wrongAnswer(); this.setFb('Not quite: ' + right + ' of your picks ' + (right === 1 ? 'is' : 'are') + ' right. +' + p + ' seconds.', 'bad'); break;
      }
      case 'choose': {
        if (n.type !== 'choice' || !v || c.elim.includes(v) || c.fifty.includes(v)) return;
        const o = n.options.find((x) => x.id === v); if (!o) return;
        if (o.right) { this.solved(); return; }
        c.elim.push(v); const p = this.wrongAnswer(v); this.setFb('Not the safest option. +' + p + ' seconds.', 'bad'); break;
      }
      case 'step': {
        if (n.type !== 'order' || !v || c.fifty.includes(v)) return;
        const pos = c.seq.indexOf(v);
        if (pos > -1) c.seq.splice(pos, 1); else if (c.seq.length < n.steps.length) c.seq.push(v);
        this.setFb(); break;
      }
      case 'clearorder': c.seq = c.seq.filter((id) => c.fifty.includes(id)); this.setFb(); break;
      case 'checkorder': {
        if (n.type !== 'order') return;
        let bad = -1;
        for (let k = 0; k < n.steps.length; k++) if (c.seq[k] !== n.steps[k].id) { bad = k; break; }
        if (bad === -1) { this.solved(); return; }
        const p = this.wrongAnswer(); c.seq = c.seq.filter((id) => c.fifty.includes(id));
        this.setFb('Step ' + (bad + 1) + ' is out of place. Try again. +' + p + ' seconds.', 'bad'); break;
      }
      default: return;
    }
    this.save(); this.sync(); this.emit();
  }
}
