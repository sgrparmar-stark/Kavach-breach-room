import { SCENARIOS, INJECTS, type Scenario, type Lock, type Decision, type Inject, type Quality } from '@/data/scenarios';

/* ---------- modes and lifelines ---------- */
export type ModeKey = 'std' | 'x';
/** pen: the first wrong-answer penalty in seconds (penalties then rise; see lib/scoring.ts). */
export const MODES: Record<ModeKey, { pen: number; label: string }> = {
  std: { pen: 20, label: 'Standard' },
  x: { pen: 30, label: 'Expert' },
};
/** Correct / wrong Insider vote. */
export const INSIDER_BONUS = 60;
export const TRACKS: Record<string, string> = { core: 'Everyone', dev: 'Developers', lead: 'Leadership' };

/* ---------- lookups ---------- */
export function gameById(id: string | null | undefined): Scenario | null {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
export function gameIndex(id: string): number {
  return SCENARIOS.findIndex((s) => s.id === id);
}
export function injectById(id: string | null | undefined): Inject | null {
  return INJECTS.find((i) => i.id === id) ?? null;
}

/* ---------- the game tree ---------- */
/* Six locks with one decision after lock 3. A poor decision sends the team through a detour (X) first. */
export type NodeId = 'L1' | 'L2' | 'L3' | 'D' | 'X' | 'L4' | 'L5' | 'L6' | 'END';
export const NODE_ORDER: NodeId[] = ['L1', 'L2', 'L3', 'D', 'X', 'L4', 'L5', 'L6', 'END'];
export const LOCK_COUNT = 6;
/** The main path, used for progress bars (the detour is extra). */
export const MAIN_STEPS: NodeId[] = ['L1', 'L2', 'L3', 'D', 'L4', 'L5', 'L6'];
/** Answer reveal order on the big screen. */
export const REVEAL_ORDER: NodeId[] = ['L1', 'L2', 'L3', 'D', 'X', 'L4', 'L5', 'L6'];
export type LockNode = Lock & { id: NodeId; label: string; next: NodeId };
export type DecisionNode = Decision & { id: 'D'; label: string };
export type EndNode = { type: 'end'; id: 'END'; label: string };
export type GameNode = LockNode | DecisionNode | EndNode;

const GRAPHS: Record<string, Record<NodeId, GameNode>> = {};
export function graph(gid: string): Record<NodeId, GameNode> {
  const cached = GRAPHS[gid];
  if (cached) return cached;
  const s = gameById(gid);
  if (!s) throw new Error('Unknown game ' + gid);
  const L = s.locks;
  if (L.length !== LOCK_COUNT) throw new Error(s.title + ' needs ' + LOCK_COUNT + ' locks');
  const lock = (i: number, id: NodeId, next: NodeId): LockNode => ({ ...L[i], id, next, label: i + 1 + ' · ' + L[i].name });
  const g: Record<NodeId, GameNode> = {
    L1: lock(0, 'L1', 'L2'),
    L2: lock(1, 'L2', 'L3'),
    L3: lock(2, 'L3', 'D'),
    D: { ...s.decision, id: 'D', label: 'Decision · ' + s.decision.name },
    X: { ...s.detour, id: 'X', next: 'L4', label: 'Detour · ' + s.detour.name },
    L4: lock(3, 'L4', 'L5'),
    L5: lock(4, 'L5', 'L6'),
    L6: lock(5, 'L6', 'END'),
    END: { type: 'end', id: 'END', label: 'Case closed' },
  };
  GRAPHS[gid] = g;
  return g;
}
export function isLockNode(n: GameNode | undefined | null): n is LockNode {
  return !!n && n.type !== 'decision' && n.type !== 'end';
}
export function nextOf(gid: string, nodeId: NodeId, choiceQ?: Quality): NodeId {
  const n = graph(gid)[nodeId];
  if (n.type === 'decision') return choiceQ === 'poor' ? 'X' : 'L4';
  if (n.type === 'end') return 'END';
  return n.next;
}
export function lockNumber(n: GameNode): string {
  return n.id === 'X' ? 'Detour' : n.id === 'D' ? 'Decision' : n.id === 'END' ? 'Case closed' : 'Lock ' + n.id.slice(1);
}
/** Steps of the main path a team has completed (0 to MAIN_STEPS.length). */
export function stepsDone(path: string[] | undefined, node: string | undefined, nodeDone: boolean, finished: boolean): number {
  if (finished) return MAIN_STEPS.length;
  return MAIN_STEPS.filter((s) => (path || []).includes(s) && (s !== node || nodeDone)).length;
}

/* ---------- outcomes ---------- */
export interface Choice { node: string; id: string; q: Quality; label: string }
export interface Outcome { key: 'full' | 'contained' | 'damage' | 'stopped'; label: string }
export function outcomeOf(choices: Choice[] | undefined): Outcome {
  let poor = 0, ok = 0;
  (choices ?? []).forEach((c) => { if (c.q === 'poor') poor++; else if (c.q === 'ok') ok++; });
  if (poor) return { key: 'damage', label: 'Contained with damage' };
  if (ok) return { key: 'contained', label: 'Contained' };
  return { key: 'full', label: 'Fully contained' };
}

/* ---------- 50:50 ---------- */
export interface FiftyResult { ids: string[]; codePrefix?: string; seq?: string[] }
function pickTwo<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, 2);
}
/** What 50:50 removes or reveals on a lock. Returns null where it can't help. */
export function fiftyFor(lock: Lock, already: { elim?: string[]; picks?: string[]; sel?: string[]; x?: string[] }): FiftyResult | null {
  switch (lock.type) {
    case 'choice': {
      const wrong = lock.options.filter((o) => !o.right && !(already.elim ?? []).includes(o.id)).map((o) => o.id);
      return wrong.length ? { ids: pickTwo(wrong) } : null;
    }
    case 'pick': {
      const decoys = lock.items.filter((i) => !i.bad).map((i) => i.id);
      return decoys.length ? { ids: pickTwo(decoys) } : null;
    }
    case 'spot': {
      const normal = lock.items.filter((i) => !i.flag && !(already.x ?? []).includes(i.id)).map((i) => i.id);
      return normal.length ? { ids: pickTwo(normal) } : null;
    }
    case 'order':
      return { ids: lock.steps.slice(0, 2).map((s) => s.id), seq: lock.steps.slice(0, 2).map((s) => s.id) };
    case 'code':
      return { ids: [], codePrefix: lock.answer.slice(0, Math.floor(lock.answer.length / 2)) };
  }
}
export function fiftyLabel(lock: Lock): string {
  switch (lock.type) {
    case 'choice': return 'Removes 2 wrong answers';
    case 'pick': return 'Rules out 2 wrong options';
    case 'spot': return 'Clears 2 normal parts';
    case 'order': return 'Places the first 2 steps';
    case 'code': return 'Reveals half the code';
  }
}

/* ---------- formatting ---------- */
export function fmt(s: number): string {
  const v = Math.max(0, Math.round(s || 0));
  const m = Math.floor(v / 60), r = v % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
}
export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
export function codeDisplay(lock: { mask: string; answer: string }): string {
  let k = 0, out = '';
  for (const ch of lock.mask) out += ch === '#' ? lock.answer[k++] : ch;
  return out;
}

/* ---------- verification code (a backup record of a result) ---------- */
function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function normTeam(t: string): string { return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
export function makeVerifyCode(team: string, secs: number, sidx: number, expert: boolean): string {
  const payload = (Math.min(secs, 9999) * 16 + sidx) * 2 + (expert ? 1 : 0);
  let p = payload.toString(36).toUpperCase(); while (p.length < 4) p = '0' + p;
  let c = (fnv(normTeam(team) + '|' + payload + '|kavach') % 1296).toString(36).toUpperCase(); while (c.length < 2) c = '0' + c;
  return p + '-' + c;
}
export function readVerifyCode(team: string, code: string): { secs: number; sidx: number; expert: boolean } | null {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== 6) return null;
  const payload = parseInt(c.slice(0, 4), 36); if (isNaN(payload)) return null;
  let chk = (fnv(normTeam(team) + '|' + payload + '|kavach') % 1296).toString(36).toUpperCase(); while (chk.length < 2) chk = '0' + chk;
  if (chk !== c.slice(4)) return null;
  const expert = payload % 2, rest = (payload - expert) / 2, sidx = rest % 16, secs = (rest - sidx) / 16;
  return { secs, sidx, expert: !!expert };
}

/* ---------- activity log labels ---------- */
export const LOG_TEXT: Record<string, string> = {
  joined: 'Registered', code_ok: 'Launched with code', code_fail: 'Wrong launch code', started: 'Clock started', solved: 'Solved', wrong: 'Wrong answer',
  askit: 'Lifeline: Ask Security team', help: 'Asked for the Security team', help_withdrawn: 'Security request withdrawn',
  fac_help_person: 'Security team member sent', fac_help_phone: 'Security hint sent to phone', fac_help_no: 'Security team not available', fifty: 'Lifeline: 50:50', decision: 'Decision', inject_answer: 'Answered surprise event', finished: 'Finished', stopped: 'Stopped',
  fac_launch: 'Facilitator launched', fac_pause: 'Facilitator paused', fac_resume: 'Facilitator resumed', fac_adj: 'Time adjusted', fac_hint: 'Free hint sent',
  fac_msg: 'Message sent', fac_inject: 'Surprise event sent', fac_jump: 'Moved in the tree', fac_end: 'Ended by facilitator', fac_remove: 'Removed', fac_code: 'Launch code issued',
  game_state: 'Game state', game_mode: 'Game setting', room: 'Room code', reset: 'Event reset', member_join: 'Teammate joined', roles_dealt: 'Secret roles dealt',
  vote: 'Insider vote', reveal: 'Insider revealed', assign: 'Game assigned', registration: 'Registration', session: 'New session', time: 'Out of time',
};
