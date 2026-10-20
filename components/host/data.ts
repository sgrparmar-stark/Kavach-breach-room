'use client';
/* Host dashboard: live data, official results and facilitator actions.
   Official times are computed here from the server-timed record (runs/{uid}), not from what a phone reports. */
import { useEffect, useRef, useState } from 'react';
import { getStore, log, clean, type Json } from '@/lib/store';
import { SCENARIOS, INJECTS } from '@/data/scenarios';
import { MODES, INSIDER_BONUS, fmt, gameById, graph, injectById, LOG_TEXT, REVEAL_ORDER, isLockNode, type ModeKey, type NodeId } from '@/lib/game';
import {
  LIMIT_S, DEFAULT_PAR, tally, activeMs, clockS, intervals, outcomeFrom, scorePct, compareResults, flagsFor, evList,
  type Result, type Ev,
} from '@/lib/scoring';
import { buildReport, describeWrong, TOPICS, type Report } from '@/lib/report';

export type Paths = 'event' | 'games' | 'teams' | 'assign' | 'runs' | 'control' | 'secrets' | 'log' | 'members' | 'roles' | 'insiders' | 'sessionsIdx';
export type Data = Record<Paths, Json> & { loaded: boolean };
/** The parts of the data needed to compute results: the live data, or an archived session. */
export type Snap = { teams: Json; assign: Json; runs: Json; control: Json; games: Json; members?: Json; insiders?: Json; log?: Json };
export interface Team { uid: string; name: string; game: string; joinedAt?: number; codeOk?: string; vote?: string; prog?: Json; help?: { node: string; at: number; label?: string } }

const PATHS: Paths[] = ['event', 'games', 'teams', 'assign', 'runs', 'control', 'secrets', 'log', 'members', 'roles', 'insiders', 'sessionsIdx'];
export const GS_LABEL: Record<string, string> = { closed: 'Ready', open: 'Running', paused: 'Paused', ended: 'Ended' };
export const ST_LABEL: Record<string, string> = { lobby: 'No game yet', waiting: 'Ready to start', playing: 'Playing', paused: 'Paused', finished: 'Finished', stopped: 'Stopped', new: 'Joining' };

export function useConsoleData(): Data {
  const [D, setD] = useState<Data>(() => ({ event: {}, games: {}, teams: {}, assign: {}, runs: {}, control: {}, secrets: {}, log: {}, members: {}, roles: {}, insiders: {}, sessionsIdx: {}, loaded: false }));
  const seen = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const store = getStore();
    const offs = PATHS.map((k) => store.on(k, (v) => {
      seen.current[k] = true;
      setD((d) => ({ ...d, [k]: v || {}, loaded: PATHS.every((p) => seen.current[p]) }));
    }));
    return () => offs.forEach((o) => o());
  }, []);
  const issuing = useRef<Record<string, boolean>>({});
  useEffect(() => { if (D.loaded) issueKeys(D, issuing.current); }, [D]);
  useEffect(() => { if (D.loaded) lateLoyals(D); }, [D]);
  return D;
}

/* ---------- derived values ---------- */
export const G = (S: Snap, gid: string): Json => (S.games && S.games[gid]) || { state: 'open', mode: 'std' };
export const prog = (t: Team): Json => t.prog || {};
export const ctlOf = (S: Snap, uid: string): Json => (S.control && S.control[uid]) || {};
export const parOf = (S: Snap, gid: string): number => Number(G(S, gid).par) || DEFAULT_PAR;
export function teamList(S: Snap): Team[] {
  const teams = S.teams || {}, assign = S.assign || {}, runs = S.runs || {};
  return Object.keys(teams).map((u) => ({ uid: u, ...teams[u], game: assign[u] || runs[u]?.game || '' }) as Team)
    .filter((t) => t.name)
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}
export function teamsOf(S: Snap, gid: string | 'all'): Team[] { return teamList(S).filter((t) => t.game && (gid === 'all' || t.game === gid)); }
export function lobbyTeams(S: Snap): Team[] { return teamList(S).filter((t) => !t.game); }
/** Teams that pressed Ask Security team and are waiting for the facilitator, oldest first. */
export interface HelpReq { t: Team; node: string; at: number; label: string; hint: string; gameTitle: string }
export function helpQueue(S: Snap): HelpReq[] {
  return teamList(S).filter((t) => t.help && t.game && !(S.runs?.[t.uid]?.finishedAt)).map((t) => {
    const h = t.help as { node: string; at: number; label?: string };
    const n = graph(t.game)[h.node as NodeId];
    return { t, node: h.node, at: Number(h.at) || 0, label: h.label || (n ? n.label : h.node), hint: n && isLockNode(n) ? n.hint : '', gameTitle: gameById(t.game)?.title || '' };
  }).sort((a, b) => a.at - b.at);
}

/** The official result for one team, from the server-timed record. */
export function resultOf(S: Snap, t: Team, now: number): Result {
  const run = (S.runs && S.runs[t.uid]) || {};
  const gid = t.game, evs: Ev[] = evList(run.ev);
  const go = evs.find((e) => e.k === 'go');
  const expert = (go?.o || prog(t).mode) === 'x';
  const T = tally(gid, expert, evs);
  const start = Number(run.startedAt) || T.startAt;
  const finished = !!(run.finishedAt || T.endAt);
  const end = Number(run.finishedAt) || T.endAt || now;
  const c = ctlOf(S, t.uid), g = G(S, gid);
  const ms = start ? activeMs(start, end, [...intervals(c.pz), ...intervals(g.pz)], evs) : 0;
  const clock = clockS(ms);
  let reason = finished ? (T.endReason || 'complete') : '';
  const timeUp = !finished && !!start && ms >= LIMIT_S * 1000;
  if (timeUp) reason = 'time';
  const completed = finished && reason === 'complete';
  const adj = Number(c.adj) || 0;
  const final = clock + T.penS + adj, par = parOf(S, gid);
  const p = prog(t);
  const status = !gid ? 'lobby' : finished || timeUp ? (completed ? 'finished' : 'stopped')
    : start ? (c.pause || g.state === 'paused' ? 'paused' : 'playing') : 'waiting';
  const r: Result = {
    uid: t.uid, name: t.name, gid, expert, status, completed, reason, clock, pen: T.penS, adj, final, par, score: scorePct(final, par),
    T, outcome: finished || timeUp ? outcomeFrom(T, reason) : { key: 'full', label: '' }, flags: [], endAt: end,
  };
  r.flags = flagsFor(r, typeof p.finalBase === 'number' ? p.finalBase + adj : null);
  return r;
}
export function resultsOf(S: Snap, gid: string | 'all', now: number): Result[] {
  return teamsOf(S, gid).map((t) => resultOf(S, t, now)).sort(compareResults);
}
export function counts(S: Snap, gid: string | 'all', now: number) {
  const c: Record<string, number> = { lobby: 0, waiting: 0, playing: 0, paused: 0, finished: 0, stopped: 0, total: 0 };
  (gid === 'all' ? teamList(S) : teamsOf(S, gid)).forEach((t) => { const s = t.game ? resultOf(S, t, now).status : 'lobby'; c[s] = (c[s] || 0) + 1; c.total++; });
  return c;
}
export function seatsOf(S: Snap, uid: string): { uid: string; seat: string }[] {
  const m = (S.members && S.members[uid]) || {};
  return Object.keys(m).filter((k) => k !== 'meta' && m[k] && m[k].seat).map((k) => ({ uid: k, seat: m[k].seat }));
}
export function logRows(S: Snap): Json[] {
  const L = S.log || {};
  return Object.keys(L).map((k) => L[k]).filter(Boolean).sort((a: Json, b: Json) => a.at - b.at);
}
export function reportOf(r: Result): Report { return buildReport(r.gid, r.T); }

/* ---------- background chores ---------- */
function issueKeys(D: Data, issuing: Record<string, boolean>) {
  const store = getStore();
  const used: Record<string, boolean> = {};
  Object.values(D.secrets as Record<string, Json>).forEach((s) => { if (s && s.code) used[s.code] = true; });
  Object.keys(D.teams).forEach((u) => {
    if (!D.assign[u] || (D.secrets[u] && D.secrets[u].code) || issuing[u] || !D.teams[u]?.name) return;
    let c: string; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (used[c]);
    used[c] = true; issuing[u] = true;
    void store.set('secrets/' + u + '/code', c).then(() => { delete issuing[u]; void log('fac_code', 'Key ' + c, { uid: u, team: D.teams[u]?.name, game: D.assign[u] }); }, () => { delete issuing[u]; });
  });
}
function lateLoyals(D: Data) {
  Object.keys(D.insiders).forEach((team) => {
    const ins = D.insiders[team];
    seatsOf(D, team).forEach((x) => { if (!D.roles[x.uid] && x.uid !== ins?.member) void getStore().set('roles/' + x.uid, { role: 'loyal', team }); });
  });
}

/* ---------- actions ---------- */
const who = (t: Team) => ({ uid: t.uid, team: t.name, game: t.game });
const teamOf = (D: Data, uid: string): Team => ({ uid, ...(D.teams[uid] || {}), game: D.assign[uid] || '' }) as Team;
function openInterval(raw: Json): string | null { if (!raw) return null; const k = Object.keys(raw).find((x) => raw[x] && raw[x].a && !raw[x].b); return k || null; }

export function setRegistration(open: boolean) {
  void getStore().update('event', { reg: open ? 'open' : 'closed', at: getStore().now() });
  void log('registration', open ? 'Opened' : 'Closed');
}
export function setGameState(D: Data, gid: string, state: 'open' | 'paused' | 'ended') {
  const store = getStore(), g = G(D, gid), now = store.now();
  if (state === 'paused' && g.state !== 'paused') void store.push('games/' + gid + '/pz', { a: now });
  if (state !== 'paused') { const k = openInterval(g.pz); if (k) void store.update('games/' + gid + '/pz/' + k, { b: now }); }
  void store.update('games/' + gid, { state, mode: g.mode || 'std', at: now });
  void log('game_state', gameById(gid)?.title + ' → ' + GS_LABEL[state], { game: gid });
}
export function setMode(D: Data, gid: string, mode: ModeKey) {
  void getStore().update('games/' + gid, { mode, state: G(D, gid).state || 'open', at: getStore().now() });
  void log('game_mode', gameById(gid)?.title + ' → ' + MODES[mode].label, { game: gid });
}
export function setInsider(D: Data, gid: string, on: boolean) {
  void getStore().update('games/' + gid, { insider: on, state: G(D, gid).state || 'open', mode: G(D, gid).mode || 'std', at: getStore().now() });
  void log('game_mode', gameById(gid)?.title + ' → Insider round ' + (on ? 'on' : 'off'), { game: gid });
}
export function setPar(D: Data, gid: string, secs: number) {
  const s = Math.max(5 * 60, Math.min(LIMIT_S, Math.round(secs)));
  void getStore().update('games/' + gid, { par: s, state: G(D, gid).state || 'open', mode: G(D, gid).mode || 'std' });
  void log('game_mode', gameById(gid)?.title + ' → par time ' + fmt(s), { game: gid });
}
export function assignTeam(D: Data, uid: string, gid: string) {
  if (D.runs[uid]?.startedAt) return false;
  const store = getStore();
  if (gid) void store.set('assign/' + uid, gid); else void store.remove('assign/' + uid);
  void log('assign', gid ? (gameById(gid)?.title || gid) : 'Unassigned', { uid, team: D.teams[uid]?.name, game: gid });
  return true;
}
/** Spreads the teams waiting for a game evenly across the chosen games. */
export function autoAssign(D: Data, gids: string[]): number {
  if (!gids.length) return 0;
  const load: Record<string, number> = {};
  gids.forEach((g) => { load[g] = teamsOf(D, g).length; });
  let n = 0;
  lobbyTeams(D).forEach((t) => {
    const g = gids.slice().sort((a, b) => load[a] - load[b] || gids.indexOf(a) - gids.indexOf(b))[0];
    load[g]++; assignTeam(D, t.uid, g); n++;
  });
  return n;
}
export function launch(t: Team) { void getStore().update('control/' + t.uid, { launch: getStore().now() }); void log('fac_launch', '', who(t)); }
export function startAll(D: Data, gid: string | 'all', now: number): number {
  let n = 0;
  teamsOf(D, gid).forEach((t) => { if (resultOf(D, t, now).status === 'waiting') { launch(t); n++; } });
  return n;
}
export type TeamCmd = 'launch' | 'pause' | 'adj' | 'hint' | 'help' | 'msg' | 'inject' | 'jump' | 'end' | 'remove' | 'newcode';
export function teamCmd(D: Data, uid: string, cmd: TeamCmd, arg?: string | number, reason?: string) {
  const store = getStore();
  const t = teamOf(D, uid), c = ctlOf(D, uid), now = store.now();
  switch (cmd) {
    case 'launch': launch(t); break;
    case 'pause': {
      if (!c.pause) void store.push('control/' + uid + '/pz', { a: now });
      else { const k = openInterval(c.pz); if (k) void store.update('control/' + uid + '/pz/' + k, { b: now }); }
      void store.update('control/' + uid, { pause: !c.pause });
      void log(c.pause ? 'fac_resume' : 'fac_pause', '', who(t)); break;
    }
    case 'adj': {
      const d = Number(arg) || 0, a = (Number(c.adj) || 0) + d, why = String(reason || '').trim() || 'No reason given';
      void store.update('control/' + uid, { adj: a });
      void store.push('control/' + uid + '/adjs', { d, why, at: now });
      void log('fac_adj', (d > 0 ? '+' : '') + d + 's · ' + why + ' (total ' + (a > 0 ? '+' : '') + a + 's)', who(t)); break;
    }
    case 'hint': void store.update('control/' + uid, { hint: { at: now } }); void log('fac_hint', prog(t).nodeName || '', who(t)); break;
    case 'help': {
      // answer an Ask Security request: 'person' (someone goes to the table), 'phone' (hint on their phone) or 'no' (nobody free; lifeline returned)
      const h = t.help; if (!h) return;
      const how = arg === 'phone' || arg === 'no' ? arg : 'person';
      void store.update('control/' + uid, { help: { at: now, req: h.at, node: h.node, how } });
      void store.remove('teams/' + uid + '/help');
      void log('fac_help_' + how, h.label || '', who(t)); break;
    }
    case 'msg': if (!arg) return; void store.update('control/' + uid, { msg: { text: String(arg), at: now } }); void log('fac_msg', String(arg), who(t)); break;
    case 'inject': void store.update('control/' + uid, { inject: { id: String(arg), at: now } }); void log('fac_inject', injectById(String(arg))?.name || '', who(t)); break;
    case 'jump': void store.update('control/' + uid, { jump: { node: String(arg), at: now } }); void log('fac_jump', graph(t.game)[String(arg) as NodeId]?.label || '', who(t)); break;
    case 'end': void store.update('control/' + uid, { end: { at: now } }); void log('fac_end', '', who(t)); break;
    case 'remove':
      seatsOf(D, uid).forEach((x) => { void store.remove('roles/' + x.uid); });
      ['members', 'insiders', 'teams', 'control', 'secrets', 'assign', 'runs'].forEach((p) => { void store.remove(p + '/' + uid); });
      void log('fac_remove', t.name || '', who(t)); break;
    case 'newcode': void store.remove('secrets/' + uid); break;
  }
}
export function broadcast(D: Data, gid: string, text: string, now: number): number {
  let n = 0;
  teamsOf(D, gid).forEach((t) => { const s = resultOf(D, t, now).status; if (s !== 'finished' && s !== 'stopped') { teamCmd(D, t.uid, 'msg', text); n++; } });
  return n;
}
export function injectAll(D: Data, gid: string, id: string, now: number): number {
  let n = 0;
  teamsOf(D, gid).forEach((t) => { const s = resultOf(D, t, now).status; if (s === 'playing' || s === 'paused') { teamCmd(D, t.uid, 'inject', id); n++; } });
  return n;
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
  teamCmd(D, t.uid, 'adj', correct ? -INSIDER_BONUS : INSIDER_BONUS, 'Insider vote ' + (correct ? 'correct' : 'wrong'));
  void store.update('control/' + t.uid, { reveal: { at: store.now(), seat: ins.seat, correct, voteSeat } });
  seatsOf(D, t.uid).forEach((x) => { void store.update('roles/' + x.uid, { revealed: { seat: ins.seat, correct } }); });
  void log('reveal', 'Insider ' + ins.seat + (correct ? ' caught' : ' escaped') + (voteSeat ? ' (voted ' + voteSeat + ')' : ' (no vote)'), who(t));
  return true;
}
export function revealAll(D: Data, gid: string, now: number): number {
  let n = 0;
  teamsOf(D, gid).forEach((t) => { if (resultOf(D, t, now).completed && revealInsider(D, t)) n++; });
  return n;
}

/* ---------- sessions: archive everything, then start with a clean slate ---------- */
export interface SessionMeta { name: string; at: number; teams: number; podium: { name: string; game: string; final: number; score: number }[] }
export async function newSession(D: Data, name: string, now: number): Promise<string> {
  const store = getStore();
  const res = resultsOf(D, 'all', now);
  const rows = res.map((r, i) => ({ rank: i + 1, uid: r.uid, name: r.name, gid: r.gid, final: r.final, score: r.score, completed: r.completed, outcome: r.outcome.label, flags: r.flags }));
  const meta: SessionMeta = {
    name: name.trim().slice(0, 60) || 'Session ' + new Date(now).toLocaleString(), at: now, teams: teamList(D).length,
    podium: res.filter((r) => r.completed).slice(0, 3).map((r) => ({ name: r.name, game: r.gid, final: r.final, score: r.score })),
  };
  const sid = 's' + now.toString(36);
  await store.set('sessions/' + sid, clean({ meta, teams: D.teams, assign: D.assign, runs: D.runs, control: D.control, log: D.log, members: D.members, insiders: D.insiders, games: D.games, results: rows }));
  await store.set('sessionsIdx/' + sid, clean(meta));
  await Promise.all(['teams', 'assign', 'runs', 'control', 'secrets', 'log', 'members', 'roles', 'insiders'].map((p) => store.remove(p).catch(() => undefined)));
  await Promise.all(SCENARIOS.map((s) => {
    const g = G(D, s.id);
    return store.set('games/' + s.id, clean({ state: 'open', mode: g.mode || 'std', insider: !!g.insider, par: g.par || null, at: now }));
  }));
  await store.update('event', { reg: 'closed', at: now });
  setTimeout(() => { void log('session', 'Archived “' + meta.name + '” and started a new session'); }, 300);
  return sid;
}

/* ---------- describing what a team did ---------- */
const strip = (h: string) => String(h || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
export function stepTitle(gid: string, n: string): string {
  if (!n) return '';
  const node = graph(gid)[n as NodeId];
  return node ? node.label : n;
}
/** One readable line per recorded event, for the answer sheet. */
export function describeEvent(gid: string, e: Ev): { step: string; what: string; tone: 'ok' | 'bad' | 'info' } | null {
  const G0 = graph(gid);
  const node = e.n ? G0[e.n as NodeId] : undefined;
  const step = node ? node.label : '';
  switch (e.k) {
    case 'go': return { step: 'Start', what: 'Clock started (' + (e.o === 'x' ? 'Expert' : 'Standard') + ')', tone: 'info' };
    case 'ok': {
      if (node && node.type === 'spot') { const it = node.items.find((i) => i.id === e.o); return { step, what: 'Found: ' + strip(it?.html || e.o || ''), tone: 'ok' }; }
      return null;
    }
    case 'x': {
      if (node && isLockNode(node)) { const d = describeWrong(node, e.o || ''); return { step, what: 'Wrong: ' + d.chose, tone: 'bad' }; }
      return { step, what: 'Wrong answer', tone: 'bad' };
    }
    case 'sv': return { step, what: 'Solved', tone: 'ok' };
    case 'ask': return { step, what: e.o === 'phone' ? 'Ask Security team: hint sent to their phone (+30s)' : 'Ask Security team: a security team member helped (+30s)', tone: 'info' };
    case 'rq': return { step, what: 'Asked for the Security team', tone: 'info' };
    case 'rqx': return { step, what: e.o === 'declined' ? 'Security team not available: lifeline returned' : 'Withdrew the Security request (solved or moved on)', tone: 'info' };
    case 'ff': return { step, what: 'Used 50:50 (+30s)', tone: 'info' };
    case 'hint': return { step, what: 'Got a hint from the facilitator (+30s)', tone: 'info' };
    case 'dec': {
      const D0 = G0.D; const o = D0.type === 'decision' ? D0.options.find((x) => x.id === e.o) : undefined;
      return { step: 'Decision', what: (o ? (o.q === 'best' ? 'Best: ' : o.q === 'ok' ? 'Acceptable: ' : 'Risky: ') + strip(o.text) : e.o || ''), tone: o?.q === 'best' ? 'ok' : o?.q === 'ok' ? 'info' : 'bad' };
    }
    case 'io': return { step: 'Surprise', what: (injectById(e.o)?.name || e.o || '') + ' arrived', tone: 'info' };
    case 'ia': {
      const [iid, oid] = (e.o || '').split(':'); const I = injectById(iid), o = I?.options.find((x) => x.id === oid);
      return { step: 'Surprise', what: (I?.name || iid) + ': ' + (o ? (o.q === 'best' ? 'Best: ' : o.q === 'ok' ? 'OK: ' : 'Poor: ') + strip(o.text) : oid), tone: o?.q === 'best' ? 'ok' : o?.q === 'ok' ? 'info' : 'bad' };
    }
    case 'ic': return null;
    case 'jump': return { step, what: 'Moved here by the facilitator', tone: 'info' };
    case 'end': return { step: 'End', what: e.o === 'complete' ? 'Closed the case' : e.o === 'time' ? 'Out of time' : e.o === 'facilitator' ? 'Stopped by the facilitator' : 'Game ended', tone: e.o === 'complete' ? 'ok' : 'bad' };
  }
}

/* ---------- question analysis across teams ---------- */
export interface QStat { node: string; title: string; reached: number; firstTry: number; avgWrong: number; common: string; split?: { label: string; q: string; n: number }[] }
export function questionStats(S: Snap, gid: string, now: number): QStat[] {
  const res = resultsOf(S, gid, now).filter((r) => r.T.startAt);
  const G0 = graph(gid), out: QStat[] = [];
  for (const id of REVEAL_ORDER) {
    const n = G0[id];
    if (n.type === 'end') continue;
    if (n.type === 'decision') {
      const split = n.options.map((o) => ({ label: strip(o.text), q: o.q, n: res.filter((r) => r.T.nodes.D?.choice === o.id).length }));
      const reached = split.reduce((a, b) => a + b.n, 0);
      out.push({ node: id, title: n.label, reached, firstTry: split.find((x) => x.q === 'best')?.n || 0, avgWrong: 0, common: '', split });
      continue;
    }
    if (!isLockNode(n)) continue;
    const st = res.map((r) => r.T.nodes[id]).filter((s) => s && (s.solved || s.wrong > 0 || s.enterAt));
    if (!st.length && id === 'X') continue;
    const tallyWrong: Record<string, number> = {};
    st.forEach((s) => s!.wrongOpts.forEach((o) => {
      const parts = n.type === 'pick' ? o.split(',').filter((x) => !n.items.find((i) => i.id === x)?.bad) : [o];
      parts.forEach((p) => { if (p) tallyWrong[p] = (tallyWrong[p] || 0) + 1; });
    }));
    const top = Object.entries(tallyWrong).sort((a, b) => b[1] - a[1])[0];
    let common = '';
    if (top) {
      const k = top[0];
      common = n.type === 'choice' ? strip(n.options.find((o) => o.id === k)?.text || k)
        : n.type === 'pick' ? strip(n.items.find((i) => i.id === k)?.text || k)
        : n.type === 'spot' ? strip(n.items.find((i) => i.id === k)?.html || k)
        : n.type === 'code' ? 'Entered ' + k : 'Wrong order';
      common += ' (' + top[1] + '×)';
    }
    out.push({
      node: id, title: n.label, reached: st.length,
      firstTry: st.filter((s) => s!.solved && s!.wrong === 0 && !s!.askIt && !s!.fifty && !s!.hint).length,
      avgWrong: st.length ? Math.round((st.reduce((a, s) => a + s!.wrong, 0) / st.length) * 10) / 10 : 0, common,
    });
  }
  return out;
}

/* ---------- exports ---------- */
function csvCell(v: Json) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function csv(rows: Json[][]) { return rows.map((r) => r.map(csvCell).join(',')).join('\n'); }
const when = (t: number) => (t ? new Date(t).toLocaleString() : '');
export function resultsCsv(S: Snap, now: number): string {
  const rows: Json[][] = [['Event rank', 'Team', 'Game', 'Round', 'Mode', 'Status', 'Outcome', 'Final time', 'Final seconds', 'Par seconds', 'Score % of par', 'Clock seconds', 'Penalty seconds',
    'Wrong answers', 'Lifelines', 'Facilitator hints', 'Decision', 'Surprise answers', 'Adjustment seconds', 'Adjustment reasons', 'Flags', 'Started', 'Finished']];
  resultsOf(S, 'all', now).forEach((r, i) => {
    const s = gameById(r.gid), c = ctlOf(S, r.uid), adjs = c.adjs ? Object.values(c.adjs as Record<string, Json>).map((a: Json) => (a.d > 0 ? '+' : '') + a.d + 's ' + a.why).join(' | ') : '';
    rows.push([r.completed ? i + 1 : '', r.name, s?.title || r.gid, s ? (s.track === 'lead' ? 'Leadership' : s.track === 'dev' ? 'Developers' : 'Everyone') : '', r.expert ? 'Expert' : 'Standard', ST_LABEL[r.status] || r.status, r.outcome.label,
      fmt(r.final), r.final, r.par, r.score, r.clock, r.pen, r.T.wrong, r.T.lifelines, r.T.hints, r.T.decQ || '', r.T.inj.map((x) => (injectById(x.id)?.name || x.id) + ': ' + x.q).join(' | '),
      r.adj, adjs, r.flags.join(' | '), when(r.T.startAt), r.completed || r.status === 'stopped' ? when(r.endAt) : '']);
  });
  return csv(rows);
}
export function actionsCsv(S: Snap, now: number): string {
  const rows: Json[][] = [['Team', 'Game', 'Type', 'Step', 'Topic', 'What happened', 'Lesson', 'Action']];
  resultsOf(S, 'all', now).filter((r) => r.T.startAt).forEach((r) => {
    const rep = reportOf(r), title = gameById(r.gid)?.title || r.gid;
    rep.strengths.forEach((s) => rows.push([r.name, title, 'Strength', s.title, TOPICS[s.topic]?.label, s.good, '', s.act]));
    rep.focus.forEach((s) => rows.push([r.name, title, 'Focus area', s.title, TOPICS[s.topic]?.label, s.chose || '', s.why || s.gap, s.act]));
    rep.actions.forEach((a) => rows.push([r.name, title, 'Action item', '', '', '', '', a]));
  });
  return csv(rows);
}
export function answersCsv(S: Snap): string {
  const rows: Json[][] = [['Team', 'Game', 'Time into game', 'Step', 'What happened']];
  teamsOf(S, 'all').forEach((t) => {
    const evs = evList(S.runs?.[t.uid]?.ev); const start = evs.find((e) => e.k === 'go')?.t || 0;
    evs.forEach((e) => { const d = describeEvent(t.game, e); if (d) rows.push([t.name, gameById(t.game)?.title || t.game, fmt((e.t - start) / 1000), d.step, d.what]); });
  });
  return csv(rows);
}
export function logCsv(S: Snap): string {
  return csv([['Time', 'Team', 'Game', 'Event', 'Detail']].concat(logRows(S).map((l) => [new Date(l.at).toLocaleString(), l.team, l.game ? gameById(l.game)?.title || l.game : '', LOG_TEXT[l.type] || l.type, l.detail])));
}
export function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8'): boolean {
  try {
    const blob = new Blob([(type.startsWith('text/csv') ? '﻿' : '') + text], { type });
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
export { INJECTS, SCENARIOS };
