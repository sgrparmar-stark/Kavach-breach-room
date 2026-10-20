/* Scoring: one set of rules used by the team's phone (live display) and the host dashboard (official result).
   Final time = active clock (max 20 minutes) + penalties ± facilitator adjustments. Score = final time ÷ par time.

   Penalties
   - Wrong answer: +20s, +40s, then +60s for each further wrong answer on the same lock (×1.5 in Expert).
   - Lifeline (Ask Security team or 50:50): +30s each. Ask Security is charged only when the facilitator sends help. A hint sent by the facilitator: +30s.
   - Decision: best 0, acceptable +60s, risky +120s (and a detour lock).
   - Surprise event: best 0, OK +30s, poor +90s. The clock pauses while the card is open, for up to 60 seconds.
   Ranking: teams that closed the case first, lowest score; ties go to fewer wrong answers, then fewer lifelines,
   then the earlier finish. Teams that didn't finish rank below, by steps completed, then score. */
import type { Quality } from '@/data/scenarios';
import { graph, nextOf, injectById, outcomeOf, MAIN_STEPS, type NodeId, type Choice, type Outcome } from './game';

export const LIMIT_S = 20 * 60;
export const DEFAULT_PAR = 15 * 60;
export const WRONG_S = [20, 40, 60];
export const EXPERT_X = 1.5;
export const LIFELINE_S = 30;
export const HINT_S = 30;
export const DEC_S: Record<Quality, number> = { best: 0, ok: 60, poor: 120 };
export const INJ_S: Record<Quality, number> = { best: 0, ok: 30, poor: 90 };
export const INJ_PAUSE_S = 60;
export const FAST_LOCK_MS = 8000;
export const FAST_FINISH_S = 5 * 60;

/** go start · ok right tap · x wrong · sv solved · ask/ff lifelines · hint facilitator hint · dec decision
 *  io/ia/ic surprise event opened / answered / closed · jump moved by facilitator · end finished */
export type EvKind = 'go' | 'ok' | 'x' | 'sv' | 'ask' | 'rq' | 'rqx' | 'ff' | 'hint' | 'dec' | 'io' | 'ia' | 'ic' | 'jump' | 'end';
export interface Ev { t: number; k: EvKind; n?: string; o?: string }
export type Interval = [number, number | null | undefined];

export function wrongPen(nth: number, expert: boolean): number {
  const base = WRONG_S[Math.min(Math.max(nth, 1), WRONG_S.length) - 1];
  return Math.round(base * (expert ? EXPERT_X : 1));
}

/** Events in time order, from an array or a database object. */
export function evList(raw: Ev[] | Record<string, Ev> | null | undefined): Ev[] {
  if (!raw) return [];
  const arr = (Array.isArray(raw) ? raw : Object.keys(raw).sort().map((k) => raw[k])).filter((e) => e && typeof e.t === 'number');
  return arr.map((e, i) => ({ e, i })).sort((a, b) => a.e.t - b.e.t || a.i - b.i).map((x) => x.e);
}

export interface NodeStat { wrong: number; wrongOpts: string[]; solved: boolean; askIt: boolean; fifty: boolean; hint: boolean; enterAt: number; solveAt: number; choice?: string; q?: Quality }
export interface Tally {
  nodes: Record<string, NodeStat>;
  wrong: number; wrongS: number; lifelines: number; lifeS: number; hints: number; hintS: number;
  decQ: Quality | null; decS: number; inj: { id: string; opt: string; q: Quality }[]; injS: number;
  penS: number; steps: number; startAt: number; endAt: number; endReason: string; choices: Choice[];
}

/** Adds up everything a team did, from its event list. */
export function tally(gid: string, expert: boolean, raw: Ev[] | Record<string, Ev> | null | undefined): Tally {
  const evs = evList(raw), G = graph(gid);
  const nodes: Record<string, NodeStat> = {};
  const ns = (n: string) => (nodes[n] ??= { wrong: 0, wrongOpts: [], solved: false, askIt: false, fifty: false, hint: false, enterAt: 0, solveAt: 0 });
  const T: Tally = { nodes, wrong: 0, wrongS: 0, lifelines: 0, lifeS: 0, hints: 0, hintS: 0, decQ: null, decS: 0, inj: [], injS: 0, penS: 0, steps: 0, startAt: 0, endAt: 0, endReason: '', choices: [] };
  let ask = false, ff = false;
  const enter = (n: string, t: number) => { if (n && n !== 'END' && !ns(n).enterAt) ns(n).enterAt = t; };
  for (const e of evs) {
    const n = e.n || '';
    switch (e.k) {
      case 'go': if (!T.startAt) { T.startAt = e.t; enter('L1', e.t); } break;
      case 'jump': if (G[n as NodeId]) { ns(n).enterAt = e.t; } break;
      case 'x': if (n) { const s = ns(n); s.wrong++; s.wrongOpts.push(e.o || ''); T.wrong++; T.wrongS += wrongPen(s.wrong, expert); } break;
      case 'sv': if (n && G[n as NodeId]) { const s = ns(n); if (!s.solved) { s.solved = true; s.solveAt = e.t; enter(nextOf(gid, n as NodeId), e.t); } } break;
      case 'ask': if (!ask) { ask = true; T.lifelines++; T.lifeS += LIFELINE_S; if (n) ns(n).askIt = true; } break;
      case 'ff': if (!ff) { ff = true; T.lifelines++; T.lifeS += LIFELINE_S; if (n) ns(n).fifty = true; } break;
      case 'hint': if (n && !ns(n).hint) { ns(n).hint = true; T.hints++; T.hintS += HINT_S; } break;
      case 'dec': {
        const D = G.D;
        if (T.decQ === null && D.type === 'decision') {
          const opt = D.options.find((o) => o.id === e.o);
          if (opt) {
            T.decQ = opt.q; T.decS = DEC_S[opt.q];
            const s = ns('D'); s.solved = true; s.solveAt = e.t; s.choice = opt.id; s.q = opt.q;
            enter(nextOf(gid, 'D', opt.q), e.t);
            T.choices.push({ node: 'D', id: opt.id, q: opt.q, label: D.name + ': ' + opt.text });
          }
        }
        break;
      }
      case 'ia': {
        const [iid, oid] = (e.o || '').split(':');
        const I = injectById(iid), opt = I?.options.find((o) => o.id === oid);
        if (I && opt) { T.inj.push({ id: iid, opt: oid, q: opt.q }); T.injS += INJ_S[opt.q]; T.choices.push({ node: 'inject:' + iid, id: oid, q: opt.q, label: I.name + ': ' + opt.text }); }
        break;
      }
      case 'end': if (!T.endAt) { T.endAt = e.t; T.endReason = e.o || ''; } break;
    }
  }
  T.steps = MAIN_STEPS.filter((s) => nodes[s]?.solved).length;
  T.penS = T.wrongS + T.lifeS + T.hintS + T.decS + T.injS;
  return T;
}

/** Pause intervals from a database object of {a, b} records. */
export function intervals(raw: Record<string, { a: number; b?: number | null }> | null | undefined): Interval[] {
  if (!raw) return [];
  return Object.keys(raw).map((k) => raw[k]).filter((x) => x && typeof x.a === 'number').map((x) => [x.a, x.b ?? null] as Interval);
}

/** Active play time in ms between start and end, minus facilitator pauses and surprise cards (max 60s each). */
export function activeMs(start: number, end: number, pauses: Interval[], raw: Ev[] | Record<string, Ev> | null | undefined): number {
  if (!start || end <= start) return 0;
  const cut: [number, number][] = [];
  const add = (a: number, b: number) => { const x = Math.max(a, start), y = Math.min(b, end); if (y > x) cut.push([x, y]); };
  pauses.forEach(([a, b]) => add(a, b ?? end));
  let openAt = 0;
  for (const e of evList(raw)) {
    if (e.k === 'io') openAt = e.t;
    else if (e.k === 'ic' && openAt) { add(openAt, Math.min(e.t, openAt + INJ_PAUSE_S * 1000)); openAt = 0; }
  }
  if (openAt) add(openAt, Math.min(end, openAt + INJ_PAUSE_S * 1000));
  cut.sort((p, q) => p[0] - q[0]);
  let paused = 0, ca = 0, cb = 0;
  for (const [a, b] of cut) {
    if (a > cb) { paused += cb - ca; ca = a; cb = b; } else cb = Math.max(cb, b);
  }
  paused += cb - ca;
  return Math.max(0, end - start - paused);
}
export const clockS = (ms: number) => Math.min(LIMIT_S, Math.floor(ms / 1000));

export function outcomeFrom(T: Tally, reason: string): Outcome {
  if (reason === 'complete') return outcomeOf(T.choices);
  if (reason === 'time') return { key: 'stopped', label: 'Out of time' };
  if (reason === 'facilitator') return { key: 'stopped', label: 'Stopped by facilitator' };
  return { key: 'stopped', label: 'Game ended before the case was closed' };
}

/* ---------- results and ranking ---------- */
export interface Result {
  uid: string; name: string; gid: string; expert: boolean;
  status: string; completed: boolean; reason: string;
  clock: number; pen: number; adj: number; final: number; par: number; score: number;
  T: Tally; outcome: Outcome; flags: string[]; endAt: number;
}
export function scorePct(final: number, par: number): number { return Math.round((final / Math.max(60, par || DEFAULT_PAR)) * 1000) / 10; }

export function compareResults(a: Result, b: Result): number {
  const fa = a.completed ? 0 : 1, fb = b.completed ? 0 : 1;
  if (fa !== fb) return fa - fb;
  if (!a.completed) {
    const sa = a.status === 'finished' || a.status === 'stopped' || a.status === 'playing' || a.status === 'paused' ? 0 : 1;
    const sb = b.status === 'finished' || b.status === 'stopped' || b.status === 'playing' || b.status === 'paused' ? 0 : 1;
    if (sa !== sb) return sa - sb;
    if (b.T.steps !== a.T.steps) return b.T.steps - a.T.steps;
  }
  return a.score - b.score || a.T.wrong - b.T.wrong || a.T.lifelines - b.T.lifelines || (a.endAt || 9e15) - (b.endAt || 9e15);
}

/** Things worth a second look before announcing winners. */
export function flagsFor(r: Result, clientFinal?: number | null): string[] {
  const f: string[] = [];
  for (const [id, s] of Object.entries(r.T.nodes)) {
    if (/^(L\d|X)$/.test(id) && s.solved && s.enterAt && s.solveAt - s.enterAt < FAST_LOCK_MS) { f.push('Very fast lock (' + id + ')'); break; }
  }
  if (r.completed && r.clock < FAST_FINISH_S) f.push('Very fast finish');
  if (r.completed && typeof clientFinal === 'number' && Math.abs(clientFinal - r.final) > 15) f.push('Phone and server times differ');
  if (Math.abs(r.adj) >= 120) f.push('Large adjustment');
  return f;
}
