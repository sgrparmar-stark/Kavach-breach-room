/* The team's game engine: one instance per phone. A team registers once for the event, waits for the
   facilitator to assign a game, then starts with its team key (or when the facilitator launches it).
   Every answer is recorded as an event, both on the phone and in the server-timed official record (runs/{uid}). */
import { getStore, lsGet, lsSet, log, type Json, type Store } from '@/lib/store';
import {
  MODES, graph, gameById, injectById, nextOf, fiftyFor, isLockNode, fmt,
  type ModeKey, type NodeId, type GameNode, type Outcome,
} from '@/lib/game';
import {
  LIMIT_S, LIFELINE_S, DEC_S, INJ_S, wrongPen, tally, activeMs, clockS, outcomeFrom,
  type Ev, type EvKind, type Interval, type Tally,
} from '@/lib/scoring';
import type { Scenario } from '@/data/scenarios';
import { play, celebrate, unlockAudio } from '@/lib/sound';

export interface Cur {
  sel: string[]; x: string[]; code: string; picks: string[]; seq: string[]; elim: string[];
  choice: string | null; fifty: string[]; fiftyCode: string; wrong: number;
}
export interface TeamState {
  name: string; registered: boolean; joinedAt: number; gid: string;
  started: boolean; startedAt: number; node: NodeId | null; path: NodeId[]; nodeDone: boolean; cur: Cur;
  ev: Ev[]; pz: Interval[]; pauseStart: number;
  /** Locks where the team used its Hint (the hint is shown inside that lock). */
  hintNodes: Record<string, 'free' | 'soc'>; handled: Record<string, number>;
  pendingInject: string | null; injectChoice: string | null;
  finished: boolean; finishedAt: number; finalBase: number; outcome: Outcome | null; endReason: string;
  msg: { text: string; at: number; seen?: boolean } | null; mode: ModeKey;
  insider: boolean; vote: string; askIt: { node: NodeId; at: number } | null; fiftyUsed: NodeId | null; streak: number; bestStreak: number;
  /** The facilitator archived the session after this team finished: keep showing the result, stop writing. */
  closed?: boolean;
  /** Last facilitator adjustment and Insider reveal seen, kept for the result screen after the session closes. */
  kept?: { adj: number; reveal: Control['reveal'] | null };
}
export interface GameState { state?: 'closed' | 'open' | 'paused' | 'ended'; mode?: ModeKey; insider?: boolean }
export interface Control {
  launch?: number; pause?: boolean; adj?: number; msg?: { text: string; at: number }; inject?: { id: string; at: number };
  jump?: { node: NodeId; at: number }; hint?: { at: number }; end?: { at: number };
  reveal?: { at: number; seat: string; correct: boolean; voteSeat: string };
}
export interface Flash { kind: 'breach' | 'granted' | 'lifeline'; text: string; at: number }

const blankCur = (): Cur => ({ sel: [], x: [], code: '', picks: [], seq: [], elim: [], choice: null, fifty: [], fiftyCode: '', wrong: 0 });
const fresh = (): TeamState => ({
  name: '', registered: false, joinedAt: 0, gid: '',
  started: false, startedAt: 0, node: null, path: [], nodeDone: false, cur: blankCur(),
  ev: [], pz: [], pauseStart: 0, hintNodes: {}, handled: {}, pendingInject: null, injectChoice: null,
  finished: false, finishedAt: 0, finalBase: 0, outcome: null, endReason: '', msg: null, mode: 'std',
  insider: false, vote: '', askIt: null, fiftyUsed: null, streak: 0, bestStreak: 0,
});

export class TeamEngine {
  gid = '';
  S: Scenario | null = null;
  G: Record<NodeId, GameNode> | null = null;
  store: Store;
  uid: string | null = null;
  P: TeamState = fresh();
  event: { reg?: string } = {};
  game: GameState = { state: 'open', mode: 'std' };
  ctl: Control = {};
  members: Json = {};
  loaded = { event: false, assign: false, ctl: false, team: false, game: false };
  fb = { msg: '', type: '' as '' | 'good' | 'bad' };
  busy = false;
  flash: Flash | null = null;
  pop: { text: string; at: number } | null = null;
  shakeId: string | null = null;
  connectError = '';
  private key = '';
  private offs: (() => void)[] = [];
  private gameOff: (() => void) | null = null;
  private membersOff: (() => void) | null = null;
  private lastSync = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private version = 0;
  private listeners = new Set<() => void>();

  constructor() { this.store = getStore(); }

  /* ---------- subscription for React ---------- */
  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getVersion = () => this.version;
  private emit() { this.version++; this.listeners.forEach((l) => l()); }

  /* ---------- derived values ---------- */
  expert() { return this.P.mode === 'x'; }
  M() { return MODES[this.P.mode] || MODES.std; }
  now() { return this.store.now(); }
  node(): GameNode | null { return this.P.node && this.G ? this.G[this.P.node] : null; }
  paused() { return this.game?.state === 'paused' || !!this.ctl?.pause; }
  ready() { return this.loaded.event && this.loaded.assign && this.loaded.ctl && (!this.gid || this.loaded.game); }
  tally(): Tally | null { return this.gid ? tally(this.gid, this.expert(), this.P.ev) : null; }
  clockMs(): number {
    const P = this.P;
    if (!P.startedAt) return 0;
    const end = P.finished ? P.finishedAt : this.now();
    const pz: Interval[] = P.pauseStart ? [...P.pz, [P.pauseStart, null]] : P.pz;
    return activeMs(P.startedAt, end, pz, P.ev);
  }
  clock(): number { return clockS(this.clockMs()); }
  penalties(): number { const T = this.tally(); return T ? T.penS : 0; }
  score(): number { return this.clock() + this.penalties() + (this.ctl?.adj || 0); }
  timeLeft(): number { return Math.max(0, LIMIT_S - this.clock()); }
  status(): string { const P = this.P; return P.finished ? 'finished' : P.started ? (this.paused() ? 'paused' : 'playing') : P.registered ? (this.gid ? 'waiting' : 'lobby') : 'new'; }
  who() { return { uid: this.uid || '', team: this.P.name, game: this.gid }; }
  seats(): { uid: string; seat: string }[] {
    const m = this.members || {};
    return Object.keys(m).filter((k) => k !== 'meta' && m[k] && m[k].seat).map((k) => ({ uid: k, seat: m[k].seat as string }));
  }
  /** Facilitator adjustment and Insider reveal for the result screen. */
  after(): { adj: number; reveal: Control['reveal'] | null } { return this.P.closed ? (this.P.kept || { adj: 0, reveal: null }) : { adj: Number(this.ctl.adj) || 0, reveal: this.ctl.reveal || null }; }
  insiderOn() { return this.P.started ? !!this.P.insider : !!this.game?.insider; }

  /* ---------- persistence ---------- */
  private save() { if (this.key) lsSet(this.key, this.P); }
  sync(force = false) {
    const P = this.P;
    if (!P.registered || !this.uid || P.closed) return;
    const t = this.now();
    if (!force && t - this.lastSync < 400) return;
    this.lastSync = t;
    const n = this.node(), T = this.tally();
    void this.store.update('teams/' + this.uid, {
      prog: {
        status: this.status(), node: P.node || '', nodeName: n ? n.label : '', path: P.path, mode: P.mode,
        steps: T ? T.steps : 0, wrong: T ? T.wrong : 0, finalBase: P.finished ? P.finalBase : null,
        outcome: P.outcome ? P.outcome.label : '', outcomeKey: P.outcome ? P.outcome.key : '', endReason: P.endReason,
        pendingInject: P.pendingInject || '', insider: !!P.insider, vote: P.vote || '', streak: P.streak, at: t,
      },
    }).catch(() => undefined);
  }
  private setFb(msg = '', type: '' | 'good' | 'bad' = '') { this.fb = { msg, type }; }
  /** Records an event locally and in the server-timed official record. */
  private rec(k: EvKind, n?: string, o?: string) {
    const e: Ev = { t: this.now(), k };
    if (n) e.n = n;
    if (o) e.o = o;
    this.P.ev.push(e);
    if (this.uid) void this.store.push('runs/' + this.uid + '/ev', { ...e, t: this.store.ts() }).catch(() => undefined);
  }

  /* ---------- lifecycle ---------- */
  async start() {
    try {
      await this.store.init();
      const uid = await this.store.signInTeam();
      this.uid = uid;
      this.key = 'kbr-t-' + uid;
      const saved = lsGet<TeamState>(this.key);
      this.P = { ...fresh(), ...(saved || {}) };
      this.P.cur = { ...blankCur(), ...(this.P.cur || {}) };
      if (!Array.isArray(this.P.ev)) this.P.ev = [];
      if (!Array.isArray(this.P.pz)) this.P.pz = [];
      this.offs.push(this.store.on('event', (v) => { this.event = v || {}; this.loaded.event = true; this.emit(); }));
      this.offs.push(this.store.on('assign/' + uid, (v) => { this.loaded.assign = true; this.onAssign(typeof v === 'string' ? v : ''); }));
      this.offs.push(this.store.on('control/' + uid, (v) => { this.ctl = v || {}; this.loaded.ctl = true; this.onCtl(); }));
      this.offs.push(this.store.on('teams/' + uid, (v) => {
        const first = !this.loaded.team; this.loaded.team = true;
        if (first && this.P.registered && v === null && !this.P.started) { this.P = fresh(); this.save(); }
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
    if (this.gameOff) { this.gameOff(); this.gameOff = null; }
    if (this.membersOff) { this.membersOff(); this.membersOff = null; }
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  private tick() {
    if (!this.P.started || this.P.finished) return;
    if (this.now() - this.lastSync > 10_000) this.sync(true);
    if (!this.paused() && this.clock() >= LIMIT_S) { this.finish('time'); return; }
    this.emit();
  }

  /* ---------- assignment: the facilitator picks the game ---------- */
  private onAssign(gidIn: string) {
    const P = this.P;
    let gid = gidIn;
    if (P.started && P.gid && gid !== P.gid) gid = P.gid; // a game in progress keeps its game
    if (gid && !gameById(gid)) gid = '';
    if (gid === this.gid && (this.G || !gid)) { this.emit(); return; }
    this.gid = gid; P.gid = gid;
    this.S = gid ? gameById(gid) : null;
    this.G = gid ? graph(gid) : null;
    if (this.gameOff) { this.gameOff(); this.gameOff = null; }
    if (this.membersOff) { this.membersOff(); this.membersOff = null; }
    this.loaded.game = !gid;
    if (gid) {
      this.gameOff = this.store.on('games/' + gid, (v) => { this.game = v || { state: 'open', mode: 'std' }; this.loaded.game = true; this.onGame(); });
    }
    this.save(); this.emit();
  }

  /* ---------- pause accounting ---------- */
  private applyPause() {
    const P = this.P;
    if (!P.started || P.finished) return;
    const pz = this.paused(), t = this.now();
    if (pz && !P.pauseStart) { P.pauseStart = t; this.save(); this.sync(true); }
    if (!pz && P.pauseStart) { P.pz.push([P.pauseStart, t]); P.pauseStart = 0; this.save(); this.sync(true); }
  }

  /* ---------- Insider round: teammates join on their own phones ---------- */
  private watchMembers() {
    if (this.membersOff || !this.P.registered || !this.gid || !this.insiderOn() || !this.uid) return;
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
    if (this.event.reg !== 'open') { this.setFb('Registration isn’t open yet. Wait for your facilitator.', 'bad'); this.emit(); return; }
    const ctl = this.ctl;
    this.busy = true;
    const P = this.P;
    P.name = t; P.registered = true; P.joinedAt = this.now();
    P.handled = { launch: ctl.launch || 0, inject: ctl.inject?.at || 0, jump: ctl.jump?.at || 0, hint: ctl.hint?.at || 0, end: ctl.end?.at || 0, msg: ctl.msg?.at || 0 };
    this.save(); this.emit();
    this.store.set('teams/' + this.uid, { name: t, joinedAt: P.joinedAt, prog: { status: 'lobby', at: this.now() } }).then(() => {
      this.busy = false; void log('joined', 'Registered', this.who()); this.setFb(); this.emit();
    }, () => {
      this.busy = false; P.registered = false; this.save(); this.setFb('Couldn’t register. Check your connection and try again.', 'bad'); this.emit();
    });
  }
  private startGame() {
    const P = this.P;
    if (P.started || !this.gid || !this.uid) return;
    P.started = true; P.startedAt = this.now(); P.node = 'L1'; P.path = ['L1']; P.cur = blankCur(); P.nodeDone = false; P.ev = []; P.pz = [];
    P.mode = this.game.mode === 'x' ? 'x' : 'std'; P.insider = !!this.game.insider;
    const uid = this.uid, store = this.store;
    void store.set('runs/' + uid + '/game', this.gid).catch(() => undefined);
    void store.set('runs/' + uid + '/startedAt', store.ts()).catch(() => undefined);
    this.rec('go', 'L1', P.mode);
    this.setFb(); this.save(); this.sync(true); void log('started', MODES[P.mode].label + ' mode', this.who());
    this.watchMembers();
    play('launch'); this.emit(); this.scrollTop();
  }
  private goTo(nodeId: NodeId) {
    if (nodeId === 'END') { this.finish('complete'); return; }
    const P = this.P;
    P.node = nodeId; P.path.push(nodeId); P.cur = blankCur(); P.nodeDone = false;
    this.setFb(); this.save(); this.sync(true); this.emit(); this.scrollTop();
  }
  private finish(reason: 'complete' | 'facilitator' | 'game' | 'time') {
    const P = this.P;
    if (P.finished || !this.gid) return;
    if (P.pendingInject) { this.rec('ic', '', P.pendingInject); P.pendingInject = null; }
    if (P.pauseStart) { P.pz.push([P.pauseStart, this.now()]); P.pauseStart = 0; }
    this.rec('end', '', reason);
    if (this.uid) void this.store.set('runs/' + this.uid + '/finishedAt', this.store.ts()).catch(() => undefined);
    P.finished = true; P.finishedAt = this.now(); P.endReason = reason;
    const T = this.tally() as Tally;
    P.finalBase = this.clock() + T.penS;
    P.outcome = outcomeFrom(T, reason);
    this.save(); this.sync(true);
    void log(reason === 'complete' ? 'finished' : reason === 'time' ? 'time' : 'stopped', P.outcome.label + ' · ' + fmt(P.finalBase + (this.ctl.adj || 0)), this.who());
    if (reason === 'complete') { play('finish'); void celebrate(); }
    this.emit(); this.scrollTop();
  }
  private scrollTop() { if (typeof window !== 'undefined') window.scrollTo(0, 0); }

  /* ---------- feedback ---------- */
  private wrongAnswer(o: string, shake?: string) {
    const P = this.P, n = this.node();
    P.cur.wrong++; P.streak = 0;
    const p = wrongPen(P.cur.wrong, this.expert());
    this.rec('x', P.node || '', o);
    this.pop = { text: '+' + p + 's', at: Date.now() };
    this.flash = { kind: 'breach', text: '+' + p + ' seconds', at: Date.now() };
    this.shakeId = shake || null;
    setTimeout(() => { this.shakeId = null; this.emit(); }, 450);
    play('wrong');
    try { navigator.vibrate?.(180); } catch { /* not supported */ }
    void log('wrong', n ? n.label : '', this.who());
    return p;
  }
  private solved() {
    const P = this.P;
    P.nodeDone = true;
    if (P.cur.wrong === 0) { P.streak++; P.bestStreak = Math.max(P.bestStreak, P.streak); } else P.streak = 0;
    this.rec('sv', P.node || '');
    this.flash = { kind: 'granted', text: P.streak >= 2 ? P.streak + ' in a row' : '', at: Date.now() };
    play(P.streak >= 2 ? 'streak' : 'correct');
    try { navigator.vibrate?.(40); } catch { /* not supported */ }
    this.setFb(); this.save(); this.sync(true);
    const n = this.node(); void log('solved', (n ? n.label : '') + (P.cur.wrong === 0 ? ' · first try' : ''), this.who());
    this.emit();
  }

  /* ---------- facilitator signals ---------- */
  private onCtl() {
    const P = this.P, ctl = this.ctl, h = P.handled || (P.handled = {});
    if (!P.registered || P.closed) { this.emit(); return; }
    P.kept = { adj: Number(ctl.adj) || 0, reveal: ctl.reveal || null };
    if (ctl.launch && ctl.launch !== h.launch) { h.launch = ctl.launch; this.save(); if (!P.started && this.gid) { this.startGame(); return; } }
    if (ctl.msg && ctl.msg.at !== h.msg) { h.msg = ctl.msg.at; P.msg = { text: ctl.msg.text, at: ctl.msg.at }; this.save(); play('alert'); }
    if (ctl.end && ctl.end.at !== h.end) { h.end = ctl.end.at; this.save(); if (P.started && !P.finished) { this.finish('facilitator'); return; } }
    if (P.started && !P.finished) {
      if (ctl.inject && ctl.inject.at !== h.inject) {
        h.inject = ctl.inject.at;
        if (injectById(ctl.inject.id) && !P.pendingInject) { P.pendingInject = ctl.inject.id; P.injectChoice = null; this.rec('io', '', ctl.inject.id); play('alert'); }
        this.save(); this.sync(true);
      }
      if (ctl.jump && ctl.jump.at !== h.jump) { h.jump = ctl.jump.at; this.save(); if (this.G && this.G[ctl.jump.node]) { this.rec('jump', ctl.jump.node); this.goTo(ctl.jump.node); return; } }
    } else {
      h.inject = ctl.inject?.at || h.inject; h.jump = ctl.jump?.at || h.jump; this.save();
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
      // A finished team keeps its result and report on screen when the facilitator starts a new session.
      if (P.finished) { if (!P.closed) { P.closed = true; this.save(); } this.emit(); return; }
      const keep = P.name; this.P = fresh(); this.P.name = keep; this.gid = ''; this.S = null; this.G = null; this.save();
      this.setFb('Your facilitator cleared this registration. Register again when registration is open.', 'bad'); this.emit(); this.scrollTop(); return;
    }
    this.emit();
  }

  /* ---------- lifelines: each one adds 30 seconds ---------- */
  /** Hint: shown straight away inside the current lock, +30 seconds, once per game. */
  canAskIt(): boolean { const n = this.node(); return !!n && isLockNode(n) && !this.P.nodeDone && !this.P.askIt && !this.P.pendingInject; }
  canFifty(): boolean { const n = this.node(); return !!n && isLockNode(n) && !this.P.nodeDone && !this.P.fiftyUsed && !this.P.pendingInject; }
  askIt() {
    if (!this.canAskIt() || this.paused()) return;
    const P = this.P, n = this.node() as GameNode;
    P.askIt = { node: n.id, at: this.now() };
    P.hintNodes[n.id] = 'soc';
    this.rec('ask', n.id);
    this.flash = { kind: 'lifeline', text: 'Hint · +' + LIFELINE_S + ' seconds', at: Date.now() };
    this.pop = { text: '+' + LIFELINE_S + 's', at: Date.now() };
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
    this.rec('ff', n.id);
    this.flash = { kind: 'lifeline', text: '50:50 · +' + LIFELINE_S + ' seconds', at: Date.now() };
    this.pop = { text: '+' + LIFELINE_S + 's', at: Date.now() };
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
      case 'again': { if (!P.closed) return; const keep = P.name; this.P = fresh(); this.P.name = keep; this.gid = ''; this.S = null; this.G = null; this.setFb(); this.save(); this.emit(); this.scrollTop(); return; }
      case 'leave': if (P.started) return; void this.store.remove('teams/' + this.uid); this.P = fresh(); this.gid = ''; this.save(); this.emit(); this.scrollTop(); return;
      case 'dec': {
        if (!n || n.type !== 'decision' || c.choice || !v) return;
        const d = n.options.find((x) => x.id === v); if (!d) return;
        c.choice = v; this.rec('dec', 'D', v);
        if (DEC_S[d.q]) this.pop = { text: '+' + DEC_S[d.q] + 's', at: Date.now() };
        play(d.q === 'best' ? 'correct' : 'wrong');
        void log('decision', d.q.toUpperCase() + ' · ' + d.text, this.who()); this.save(); this.sync(true); this.emit(); return;
      }
      case 'inj': {
        if (P.injectChoice || !v) return;
        const I = injectById(P.pendingInject); if (!I) return;
        const io = I.options.find((x) => x.id === v); if (!io) return;
        P.injectChoice = v; this.rec('ia', '', I.id + ':' + v);
        if (INJ_S[io.q]) this.pop = { text: '+' + INJ_S[io.q] + 's', at: Date.now() };
        play(io.q === 'best' ? 'correct' : 'wrong');
        void log('inject_answer', I.name + ' · ' + io.q.toUpperCase(), this.who()); this.save(); this.sync(true); this.emit(); return;
      }
      case 'injdone': if (P.pendingInject) this.rec('ic', '', P.pendingInject); P.pendingInject = null; P.injectChoice = null; this.save(); this.sync(true); this.emit(); this.scrollTop(); return;
      case 'next': {
        if (!n || !this.gid) return;
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
          c.sel.push(v); this.rec('ok', n.id, v);
          if (c.sel.length === need) { this.solved(); return; }
          this.setFb('Good catch. ' + (need - c.sel.length) + ' to go.', 'good'); play('correct');
        } else { c.x.push(v); const p = this.wrongAnswer(v, v); this.setFb('That part is normal. +' + p + ' seconds.', 'bad'); }
        break;
      }
      case 'key': if (n.type !== 'code' || !v) return; if (c.code.length < n.answer.length) c.code += v; this.setFb(); break;
      case 'del': if (c.code.length > c.fiftyCode.length) c.code = c.code.slice(0, -1); this.setFb(); break;
      case 'checkcode': {
        if (n.type !== 'code') return;
        if (c.code.length < n.answer.length) { this.setFb('Enter all ' + n.answer.length + ' digits.', 'bad'); break; }
        if (c.code === n.answer) { this.solved(); return; }
        const p = this.wrongAnswer(c.code, 'code'); c.code = c.fiftyCode; this.setFb('Not that one. +' + p + ' seconds.', 'bad'); break;
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
        const p = this.wrongAnswer(c.picks.join(',')); this.setFb('Not quite: ' + right + ' of your picks ' + (right === 1 ? 'is' : 'are') + ' right. +' + p + ' seconds.', 'bad'); break;
      }
      case 'choose': {
        if (n.type !== 'choice' || !v || c.elim.includes(v) || c.fifty.includes(v)) return;
        const o = n.options.find((x) => x.id === v); if (!o) return;
        if (o.right) { this.solved(); return; }
        c.elim.push(v); const p = this.wrongAnswer(v, v); this.setFb('Not the safest option. +' + p + ' seconds.', 'bad'); break;
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
        const p = this.wrongAnswer(c.seq.join(',')); c.seq = c.seq.filter((id) => c.fifty.includes(id));
        this.setFb('Step ' + (bad + 1) + ' is out of place. Try again. +' + p + ' seconds.', 'bad'); break;
      }
      default: return;
    }
    this.save(); this.sync(); this.emit();
  }
}
