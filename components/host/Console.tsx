'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, Copy, Download, Printer, Play, Archive } from 'lucide-react';
import { SCENARIOS, INJECTS } from '@/data/scenarios';
import { MODES, LOG_TEXT, LOCK_COUNT, TRACKS, fmt, clock, gameById, graph, injectById, lockNumber, type NodeId } from '@/lib/game';
import { LIMIT_S, DEFAULT_PAR } from '@/lib/scoring';
import { getStore, setWriteErrorHandler, lsGet, lsSet, SS } from '@/lib/store';
import { baseUrl, go, setBaseUrl, playUrl } from '@/lib/nav';
import { useNow } from '@/lib/hooks';
import { Shield, Pill, QRBox, Html } from '@/components/ui';
import { DemoStrip } from '@/components/DemoStrip';
import { ReportView } from '@/components/Report';
import Tree from './Tree';
import Projector, { Board, type ProjKind } from './Projector';
import History from './History';
import {
  useConsoleData, G, teamList, teamsOf, lobbyTeams, resultOf, resultsOf, counts, ctlOf, seatsOf, logRows, reportOf, parOf, GS_LABEL, ST_LABEL,
  setRegistration, setGameState, setMode, setInsider, setPar, setPool, poolOf, DEFAULT_POOL, assignTeam, startAll, teamCmd, broadcast, injectAll, dealTeam, dealRoles,
  revealInsider, revealAll, newSession, resultsCsv, logCsv, downloadText, copyText, type Data, type Team, type TeamCmd,
} from './data';

type Tab = 'live' | 'board' | 'history' | 'log' | 'setup';
type SetProj = (p: { kind: ProjKind; gid: string } | null) => void;
const TABS: [Tab, string][] = [['live', 'Games'], ['board', 'Results'], ['history', 'History'], ['log', 'Log'], ['setup', 'Setup']];
const SECTIONS: { track: string; label: string }[] = [{ track: 'core', label: 'Everyone' }, { track: 'dev', label: 'Developer round' }, { track: 'lead', label: 'Leadership round' }];

export default function Console({ onSignOut }: { onSignOut: () => void }) {
  const D = useConsoleData();
  const now = useNow(1000);
  const store = getStore();
  const [sel, setSelRaw] = useState<string>(() => SS().getItem('kbr-sel') || 'all');
  const [tab, setTabRaw] = useState<Tab>(() => (SS().getItem('kbr-tab') as Tab) || 'live');
  const [team, setTeam] = useState<string | null>(null);
  const [pickNode, setPickNode] = useState<NodeId | null>(null);
  const [proj, setProj] = useState<{ kind: ProjKind; gid: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [flash, setFlashRaw] = useState('');
  const [writeErr, setWriteErr] = useState('');
  const [online, setOnline] = useState(true);
  const [boardGame, setBoardGame] = useState('all');
  const [logFilter, setLogFilter] = useState('all');
  const [base, setBaseRaw] = useState<string>(() => lsGet<string>('kbr-base') || baseUrl());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSel = (v: string) => { setSelRaw(v); SS().setItem('kbr-sel', v); setConfirm(null); };
  const setTab = (v: Tab) => { setTabRaw(v); SS().setItem('kbr-tab', v); setConfirm(null); };
  const say = useCallback((m: string) => {
    setFlashRaw(m);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashRaw(''), 3500);
  }, []);

  useEffect(() => {
    document.body.classList.add('is-console');
    setWriteErrorHandler((e) => {
      const msg = String((e as { code?: string; message?: string })?.code || (e as Error)?.message || '');
      setWriteErr(/permission|denied/i.test(msg)
        ? 'The database refused a change. Check that the latest rules are published and that FACILITATOR_EMAIL in them is exactly the email you signed in with.'
        : 'Couldn’t reach the database. Check the internet connection.');
    });
    const off = store.onConnected ? store.onConnected(setOnline) : () => undefined;
    return () => { document.body.classList.remove('is-console'); setWriteErrorHandler(null); off(); };
  }, [store]);
  useEffect(() => { setBaseUrl(base ? () => base : null); }, [base]);

  const backLabel = proj ? 'Close big screen' : team ? 'Back to teams' : tab !== 'live' ? 'Back to games' : sel !== 'all' ? 'All games' : 'Start page';
  const goBack = () => {
    if (proj) setProj(null);
    else if (team) { setTeam(null); setPickNode(null); }
    else if (tab !== 'live') setTab('live');
    else if (sel !== 'all') setSel('all');
    else go('/');
  };

  return (
    <>
      <DemoStrip where="Host dashboard" />
      <header className="ctop">
        <div className="ctop-in">
          <button type="button" className="cbtn backc" onClick={goBack} data-a="back"><ArrowLeft size={16} aria-hidden /> {backLabel}</button>
          <span className="brand"><Shield filled={4} className="hdr" />Breach Room host</span>
          <span className={'mode' + (store.mode === 'live' ? ' live' : '')}>{store.mode === 'live' ? (online ? 'CONNECTED' : 'OFFLINE') : 'DEMO'}</span>
          {flash ? <span className="flashmsg" role="status">{flash}</span> : null}
          <span className="sp" />
          <button type="button" className="cbtn" onClick={onSignOut} data-a="signout">Sign out</button>
        </div>
      </header>
      {writeErr ? <div className="errbar" role="alert"><strong>Changes aren’t being saved.</strong> {writeErr} <button className="b2 sm" type="button" onClick={() => setWriteErr('')}>Dismiss</button></div> : null}
      {store.mode === 'demo' && !store.persistent ? <div className="errbar" role="status"><strong>This preview blocks browser storage,</strong> so other tabs can’t see this dashboard’s data. Open it in a normal browser window to test with several tabs.</div> : null}
      <div className="cwrap one">
        <div className="ctabs" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-a="tab" data-v={k}>{l}</button>)}
        </div>
        {tab === 'live' ? (sel === 'all'
          ? <Overview D={D} now={now} base={base} setSel={setSel} setProj={setProj} confirm={confirm} setConfirm={setConfirm} say={say} openTeam={(u) => { setTeam(u); setPickNode(null); }} />
          : <GameView D={D} gid={sel} now={now} say={say} setProj={setProj} confirm={confirm} setConfirm={setConfirm} openTeam={(u) => { setTeam(u); setPickNode(null); }} selTeam={team} />)
          : tab === 'board' ? <ResultsTab D={D} now={now} gid={boardGame} setGid={setBoardGame} setProj={setProj} say={say} />
          : tab === 'history' ? <History D={D} now={now} say={say} />
          : tab === 'log' ? <LogTab D={D} filter={logFilter} setFilter={setLogFilter} />
          : <SetupTab D={D} now={now} base={base} setBase={(b) => { setBaseRaw(b); lsSet('kbr-base', b); say('Address saved'); }} setProj={setProj} confirm={confirm} setConfirm={setConfirm} say={say} />}
      </div>
      {team && D.teams[team] ? <Drawer D={D} uid={team} now={now} pickNode={pickNode} setPickNode={setPickNode} confirm={confirm} setConfirm={setConfirm} say={say} onClose={() => { setTeam(null); setPickNode(null); }} /> : null}
      {proj ? <Projector D={D} kind={proj.kind} gid={proj.gid} base={base} onClose={() => setProj(null)} /> : null}
      <div id="print">
        {base ? (
          <div className="pcard">
            <div className="pk">KAVACH BREACH ROOM</div><h2>Scan to join</h2>
            <QRBox value={playUrl()} size={260} />
            <p>Scan with your phone, or go to <b>{base.replace(/^https?:\/\//, '').replace(/\/$/, '')}/play</b>, then register your team.</p>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ---------- all games: registration, the lobby, and the game list ---------- */
function Overview({ D, now, base, setSel, setProj, confirm, setConfirm, say, openTeam }: {
  D: Data; now: number; base: string; setSel: (v: string) => void; setProj: SetProj; confirm: string | null; setConfirm: (v: string | null) => void; say: (m: string) => void; openTeam: (u: string) => void;
}) {
  const all = counts(D, 'all', now);
  const reg = D.event?.reg === 'open';
  const demo = getStore().mode === 'demo';
  const url = base && !demo ? playUrl() : '';
  const states = SCENARIOS.map((s) => G(D, s.id).state || 'open');
  const anyPaused = states.includes('paused');
  const allState = (v: 'paused' | 'open' | 'ended') => {
    let n = 0;
    SCENARIOS.forEach((s) => {
      const st = G(D, s.id).state || 'open', active = teamsOf(D, s.id).some((t) => ['playing', 'paused'].includes(resultOf(D, t, now).status));
      if (v === 'paused' && st !== 'paused' && active) { setGameState(D, s.id, 'paused'); n++; }
      if (v === 'open' && st === 'paused') { setGameState(D, s.id, 'open'); n++; }
      if (v === 'ended' && active) { setGameState(D, s.id, 'ended'); n++; }
    });
    setConfirm(null); say(n + ' game' + (n === 1 ? '' : 's') + ' updated');
  };
  return (
    <>
      <div className="joinbar">
        {url ? <QRBox value={url} size={84} label="QR code to join" className="mini" /> : null}
        <div className="jroom">
          <span className="lbl">Registration</span>
          <div className="seg" role="group" aria-label="Registration">
            <button type="button" aria-pressed={!reg} onClick={() => setRegistration(false)} data-a="reg" data-v="closed">Closed</button>
            <button type="button" aria-pressed={reg} onClick={() => setRegistration(true)} data-a="reg" data-v="open">Open</button>
          </div>
          <span className="small">{all.total} registered · {all.lobby} getting a game · {all.waiting} ready to start · {all.playing + all.paused} playing · {all.finished + all.stopped} done</span>
        </div>
        <span className="sp" />
        <div className="screens">
          <span className="lbl">Big screen</span>
          <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'lobby', gid: 'all' })} data-a="proj-lobby">Lobby + QR</button>
          <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'race', gid: 'all' })} data-a="race-all">Live race</button>
          <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'board', gid: 'all' })} data-a="proj-podium">Winners</button>
        </div>
      </div>
      <ReadyPanel D={D} now={now} say={say} openTeam={openTeam} />
      <div className="toolbar">
        <b>Games</b>
        <span className="sp" />
        {anyPaused ? <button className="b2" type="button" onClick={() => allState('open')}>Resume all</button>
          : all.playing ? <button className="b2" type="button" onClick={() => allState('paused')}>Pause all</button> : null}
        {all.playing + all.paused ? (confirm === 'endall'
          ? <><button className="b2 warn" type="button" onClick={() => allState('ended')}>Yes, end all</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
          : <button className="b2 warn" type="button" onClick={() => setConfirm('endall')}>End all</button>) : null}
      </div>
      <div className="glist">
        {SECTIONS.map((sec) => (
          <div key={sec.track}>
            {sec.track !== 'core' ? <div className="side-h">{sec.label}</div> : null}
            {SCENARIOS.filter((s) => s.track === sec.track).map((s) => {
              const g = G(D, s.id), c = counts(D, s.id, now), st = g.state || 'open', i = SCENARIOS.indexOf(s);
              return (
                <div key={s.id} className="grow">
                  <button type="button" className="gmain" onClick={() => setSel(s.id)} data-a="sel" data-v={s.id}>
                    <span className={'gnum' + (s.track === 'lead' ? ' lead' : '')}>{i + 1}</span>
                    <span className="gt"><b>{s.title}</b><small>{s.threat}</small></span>
                  </button>
                  {st !== 'open' ? <Pill kind={st}>{GS_LABEL[st]}</Pill> : null}
                  <span className="gmeta">{c.total ? c.total + ' team' + (c.total === 1 ? '' : 's') + (c.playing + c.paused ? ' · ' + (c.playing + c.paused) + ' playing' : '') : 'No teams'}</span>
                  <button className="b2 sm ic" type="button" onClick={() => setSel(s.id)} aria-label={'Open ' + s.title}><ChevronRight size={16} aria-hidden /></button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

/** Each team is dealt a game automatically when it registers; here you start them, one by one or all together. */
function ReadyPanel({ D, now, say, openTeam }: { D: Data; now: number; say: (m: string) => void; openTeam: (u: string) => void }) {
  const ready = teamsOf(D, 'all').filter((t) => resultOf(D, t, now).status === 'waiting');
  const dealing = lobbyTeams(D);
  const pool = poolOf(D);
  const spread = <p className="small spread">Teams per game: {pool.map((g, i) => <span key={g}>{i ? ' · ' : ''}{gameById(g)?.title} <b>{teamsOf(D, g).length}</b></span>)}</p>;
  if (!ready.length && !dealing.length) {
    return D.event?.reg === 'open' ? <div className="empty slim">Registration is open. Each team gets a game automatically when it registers, then appears here for you to start.{teamList(D).length ? spread : null}</div> : null;
  }
  return (
    <div className="card lobby-card">
      <div className="toolbar" style={{ margin: 0 }}>
        <b>Ready to start ({ready.length})</b>
        <span className="sp" />
        {ready.length ? <button className="b2 pri sm" type="button" onClick={() => { const n = startAll(D, 'all', now); say('Started ' + n + ' team' + (n === 1 ? '' : 's')); }} data-a="startall-all"><Play size={14} aria-hidden /> Start all ready ({ready.length})</button> : null}
      </div>
      <div className="lobby-rows">
        {dealing.map((t) => (
          <div key={t.uid} className="lrow">
            <button type="button" className="tn" onClick={() => openTeam(t.uid)} data-a="open" data-v={t.uid}>{t.name}</button>
            <span className="small">Getting a game…</span>
          </div>
        ))}
        {ready.map((t) => (
          <div key={t.uid} className="lrow">
            <button type="button" className="tn" onClick={() => openTeam(t.uid)} data-a="open" data-v={t.uid}>{t.name}</button>
            <span className="small">{gameById(t.game)?.title} · registered {clock(t.joinedAt || 0)}</span>
            <span className="sp" />
            <button className="b2 pri sm" type="button" onClick={() => { teamCmd(D, t.uid, 'launch'); say('Started ' + t.name); }} data-a="start" data-v={t.uid}><Play size={14} aria-hidden /> Start</button>
          </div>
        ))}
      </div>
      {spread}
    </div>
  );
}

/* ---------- one game ---------- */
function GameView({ D, gid, now, say, setProj, confirm, setConfirm, openTeam, selTeam }: {
  D: Data; gid: string; now: number; say: (m: string) => void; setProj: SetProj;
  confirm: string | null; setConfirm: (v: string | null) => void; openTeam: (u: string) => void; selTeam: string | null;
}) {
  const s = gameById(gid);
  const [bc, setBc] = useState('');
  if (!s) return null;
  const g = G(D, gid), res = resultsOf(D, gid, now), c = counts(D, gid, now);
  const st = g.state || 'open';
  return (
    <>
      <div className="ghead">
        <h2>{s.title}</h2>
        {st !== 'open' ? <Pill kind={st}>{GS_LABEL[st]}</Pill> : null}
        <span className="tagline">{TRACKS[s.track]} · par {fmt(parOf(D, gid))}</span>
        <span className="sp" />
        <div className="seg" role="group" aria-label="Difficulty">
          <button type="button" aria-pressed={g.mode !== 'x'} onClick={() => setMode(D, gid, 'std')} data-a="gmode" data-v="std">Standard</button>
          <button type="button" aria-pressed={g.mode === 'x'} onClick={() => setMode(D, gid, 'x')} data-a="gmode" data-v="x">Expert</button>
        </div>
      </div>
      <div className="toolbar">
        <button className="b2 pri" type="button" disabled={!c.waiting} onClick={() => { const n = startAll(D, gid, now); say(n ? 'Started ' + n + ' team' + (n === 1 ? '' : 's') : 'No teams are ready'); }} data-a="startall"><Play size={14} aria-hidden /> Start all ready ({c.waiting})</button>
        {st === 'paused' ? <button className="b2 good" type="button" onClick={() => setGameState(D, gid, 'open')} data-a="gstate" data-g={gid} data-v="resume">Resume</button>
          : st === 'ended' ? <button className="b2" type="button" onClick={() => setGameState(D, gid, 'open')} data-a="gstate" data-g={gid} data-v="reopen">Reopen</button>
          : <button className="b2" type="button" onClick={() => setGameState(D, gid, 'paused')} data-a="gstate" data-g={gid} data-v="paused">Pause</button>}
        {st !== 'ended' ? (confirm === 'end:' + gid
          ? <><button className="b2 warn" type="button" onClick={() => { setGameState(D, gid, 'ended'); setConfirm(null); }} data-a="endyes">Yes, end for everyone</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
          : <button className="b2 warn" type="button" onClick={() => setConfirm('end:' + gid)} data-a="end">End game</button>) : null}
        <span className="sp" />
        <span className="lbl">Big screen</span>
        <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'race', gid })} data-a="proj-race">Live race</button>
        <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'reveal', gid })} data-a="proj-reveal">Answers</button>
        <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'board', gid })} data-a="proj-board">Leaderboard</button>
      </div>
      {res.length ? (
        <div className="log-wrap">
          <table className="ttable">
            <thead><tr><th>Team</th><th>Status</th><th>Where</th><th>Time</th><th>Wrong</th><th /></tr></thead>
            <tbody>
              {res.map((r) => {
                const t = D.teams[r.uid] || {}, p = t.prog || {}, ctl = ctlOf(D, r.uid);
                let where: ReactNode = r.status === 'waiting' ? 'Ready to start'
                  : p.pendingInject ? <span className="q-poor">Surprise: {injectById(p.pendingInject)?.name}</span> : <Html html={p.nodeName || ''} />;
                if (r.status === 'finished' || r.status === 'stopped') where = r.outcome.label;
                const sn = seatsOf(D, r.uid).length, ins = D.insiders[r.uid];
                return (
                  <tr key={r.uid} className={selTeam === r.uid ? 'sel' : ''}>
                    <td><button type="button" className="tn" onClick={() => openTeam(r.uid)} data-a="open" data-v={r.uid}>{r.name}</button>{r.flags.length ? <span className="flag" title={r.flags.join(' · ')}> ⚑</span> : null}</td>
                    <td><Pill kind={r.status}>{ST_LABEL[r.status] || r.status}</Pill></td>
                    <td>{where}{g.insider || p.insider ? <div className="small">{sn} teammate{sn === 1 ? '' : 's'}{ins ? ' · roles dealt' : ''}{t.vote ? ' · voted' : ''}{ctl.reveal ? ' · revealed' : ''}</div> : null}</td>
                    <td className="mono">{r.T.startAt ? fmt(r.final) : '—'}</td>
                    <td className="mono">{r.T.wrong}</td>
                    <td><div className="acts end">
                      {r.status === 'waiting' ? <button className="b2 pri sm" type="button" onClick={() => { teamCmd(D, r.uid, 'launch'); say('Started ' + r.name); }} data-a="launch">Start</button>
                        : r.status === 'playing' || r.status === 'paused' ? <button className="b2 sm" type="button" onClick={() => teamCmd(D, r.uid, 'pause')}>{ctl.pause ? 'Resume' : 'Pause'}</button> : null}
                      <button className="b2 sm" type="button" onClick={() => openTeam(r.uid)} data-a="control">Control</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <div className="empty">No teams in this game yet. Assign teams from the lobby on the Games page.</div>}
      <details className="more" open={g.insider ? true : undefined}>
        <summary data-a="more">More: message everyone, surprise events, Insider round</summary>
        <div className="more-b">
          <h4>Message every team in this game</h4>
          <form className="msgrow" onSubmit={(ev) => { ev.preventDefault(); if (bc.trim()) { const n = broadcast(D, gid, bc.trim(), now); setBc(''); say('Message sent to ' + n + ' team' + (n === 1 ? '' : 's')); } }}>
            <input placeholder="e.g. Five minutes left!" maxLength={140} value={bc} onChange={(ev) => setBc(ev.target.value)} aria-label="Message to all teams" />
            <button className="b2" type="submit">Send</button>
          </form>
          <h4>Surprise event for every team playing</h4>
          <div className="acts">
            {INJECTS.map((I) => <button key={I.id} className="b2 sm" type="button" title={I.prompt} onClick={() => { const n = injectAll(D, gid, I.id, now); say(I.name + ' sent to ' + n + ' team' + (n === 1 ? '' : 's')); }}>{I.name}</button>)}
          </div>
          <h4>Insider round</h4>
          <div className="acts">
            <div className="seg" role="group" aria-label="Insider round">
              <button type="button" aria-pressed={!g.insider} onClick={() => setInsider(D, gid, false)} data-a="ginsider" data-v="0">Off</button>
              <button type="button" aria-pressed={!!g.insider} onClick={() => setInsider(D, gid, true)} data-a="ginsider" data-v="1">On</button>
            </div>
            {g.insider ? (
              <>
                <button className="b2 pri" type="button" onClick={() => { const r = dealRoles(D, gid); say('Roles dealt to ' + r.n + ' team' + (r.n === 1 ? '' : 's') + (r.few ? ' · ' + r.few + ' waiting for 2+ teammates' : '')); }} data-a="deal">Deal secret roles</button>
                <button className="b2" type="button" onClick={() => { const n = revealAll(D, gid, now); say(n ? 'Revealed for ' + n + ' team' + (n === 1 ? '' : 's') : 'Nothing to reveal yet: teams reveal after they finish'); }} data-a="revealall">Reveal Insiders</button>
              </>
            ) : null}
          </div>
          <p className="small">{g.insider ? 'Turn on before you start the teams on this game. Teammates scan the code on their team’s phone; deal roles before you start.' : 'A reserve twist: one teammate secretly works against the team, and teams vote at the end.'}</p>
        </div>
      </details>
    </>
  );
}

/* ---------- one team ---------- */
function Drawer({ D, uid, now, pickNode, setPickNode, confirm, setConfirm, say, onClose }: {
  D: Data; uid: string; now: number; pickNode: NodeId | null; setPickNode: (n: NodeId | null) => void; confirm: string | null; setConfirm: (v: string | null) => void; say: (m: string) => void; onClose: () => void;
}) {
  const [msg, setMsg] = useState('');
  const [adjBy, setAdjBy] = useState(0);
  const [why, setWhy] = useState('');
  const t: Team = { uid, ...D.teams[uid], game: D.assign[uid] || '' } as Team;
  const r = t.game ? resultOf(D, t, now) : null;
  const st = r ? r.status : 'lobby', ctl = ctlOf(D, uid), s = gameById(t.game);
  const active = st === 'playing' || st === 'paused';
  const cmd = (c: TeamCmd, arg?: string | number, label?: string, reason?: string) => { teamCmd(D, uid, c, arg, reason); setConfirm(null); if (label) say(label); };
  const tl = logRows(D).filter((l) => l.uid === uid).slice(-40).reverse();
  const seats = seatsOf(D, uid), ins = D.insiders[uid];
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  const node = r && t.prog?.node && s ? graph(t.game)[t.prog.node as NodeId] : null;
  const where = !r ? 'No game yet' : st === 'waiting' ? 'Ready to start' : st === 'finished' || st === 'stopped' ? r.outcome.label : node ? (node.type === 'decision' || node.id === 'X' ? lockNumber(node) : lockNumber(node) + ' of ' + LOCK_COUNT) + ': ' + (node.type === 'end' ? '' : node.name) : '';
  return (
    <div className="drawer" role="dialog" aria-label="Team control">
      <div className="drawer-h">
        <button className="b2 sm" type="button" onClick={onClose} data-a="close"><ArrowLeft size={15} aria-hidden /> Back</button>
        <h2>{t.name}</h2>
        <Pill kind={st}>{ST_LABEL[st] || st}</Pill>
      </div>
      <div className="drawer-b">
        <div className="dsum">
          <div className="bigtime">{r && r.T.startAt ? fmt(r.final) : '—'}</div>
          <div>
            <div className="dwhere">{where}</div>
            <div className="small">{s ? s.title + ' · ' + MODES[(G(D, t.game).mode || 'std') as 'std' | 'x'].label : 'Registered ' + clock(t.joinedAt || 0)}{r && r.T.startAt ? ' · clock ' + fmt(r.clock) + ' · ' + r.T.wrong + ' wrong · ' + r.pen + 's penalties' + (r.adj ? ' · ' + (r.adj > 0 ? '+' : '') + r.adj + 's by you' : '') : ''}</div>
            {r && r.flags.length ? <div className="small flag">Check: {r.flags.join(' · ')}</div> : null}
          </div>
        </div>
        {!r || st === 'waiting' ? (
          <div className="sec">
            <div className="acts">
              <span className="lbl">Change game</span>
              <select className="sel sm" value={t.game} onChange={(ev) => { if (ev.target.value && assignTeam(D, uid, ev.target.value)) say('Moved to ' + gameById(ev.target.value)?.title); }} data-a="t-assign">
                {t.game ? null : <option value="">Getting a game…</option>}
                {SECTIONS.map((sec) => <optgroup key={sec.track} label={sec.label}>{SCENARIOS.filter((x) => x.track === sec.track).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</optgroup>)}
              </select>
            </div>
            {r ? (
              <>
                <div className="acts" style={{ marginTop: 10 }}><button className="b2 pri" type="button" onClick={() => cmd('launch', undefined, 'Started')} data-a="t-launch"><Play size={14} aria-hidden /> Start now</button></div>
              </>
            ) : null}
          </div>
        ) : null}
        {active ? (
          <div className="sec">
            <div className="acts">
              <button className="b2" type="button" onClick={() => cmd('pause', undefined, 'Done')} data-a="t-pause">{ctl.pause ? 'Resume' : 'Pause'}</button>
              {confirm === 'tend:' + uid
                ? <><button className="b2 warn" type="button" onClick={() => cmd('end', undefined, 'Game ended for that team')} data-a="t-end">Yes, end their game</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
                : <button className="b2 warn" type="button" onClick={() => setConfirm('tend:' + uid)} data-a="t-endq">End their game</button>}
            </div>
          </div>
        ) : null}
        {r && r.T.startAt ? (
          <div className="sec">
            <div className="acts">
              <span className="lbl">Adjust time</span>
              {[-30, 30, 60].map((d) => <button key={d} className={'b2 sm' + (adjBy === d ? ' on' : '')} type="button" onClick={() => setAdjBy(adjBy === d ? 0 : d)} data-a="t-adj" data-v={d}>{d > 0 ? '+' : '−'}{Math.abs(d)}s</button>)}
            </div>
            {adjBy ? (
              <form className="msgrow" style={{ marginTop: 8 }} onSubmit={(ev) => { ev.preventDefault(); if (why.trim()) { cmd('adj', adjBy, 'Time adjusted', why.trim()); setAdjBy(0); setWhy(''); } }}>
                <input maxLength={80} placeholder="Reason (required), e.g. phone crashed" value={why} onChange={(ev) => setWhy(ev.target.value)} aria-label="Reason" data-a="t-adjwhy" autoFocus />
                <button className="b2 pri" type="submit" disabled={!why.trim()} data-a="t-adjgo">Apply {adjBy > 0 ? '+' : '−'}{Math.abs(adjBy)}s</button>
              </form>
            ) : null}
          </div>
        ) : null}
        {r ? (
          <div className="sec">
            <form className="msgrow" onSubmit={(ev) => { ev.preventDefault(); if (msg.trim()) { cmd('msg', msg.trim(), 'Message sent'); setMsg(''); } }}>
              <input maxLength={140} placeholder="Message this team" value={msg} onChange={(ev) => setMsg(ev.target.value)} aria-label="Message" data-a="t-msginput" />
              <button className="b2" type="submit" data-a="t-msg">Send</button>
            </form>
          </div>
        ) : null}
        {r && r.T.startAt && (st === 'finished' || st === 'stopped') ? (
          <div className="sec"><h3>Kavach report</h3><ReportView rep={reportOf(r)} /></div>
        ) : null}
        {r && r.T.startAt ? (
          <div className="sec">
            <h3>Game tree</h3>
            <Tree gid={t.game} p={{ ...(t.prog || {}), status: st === 'finished' ? 'finished' : t.prog?.status }} picked={pickNode} onPick={setPickNode} />
            {pickNode ? (
              <div className="note-box">Send this team to <strong>{graph(t.game)[pickNode].label}</strong>?
                <div className="acts" style={{ marginTop: 6 }}>
                  <button className="b2 pri sm" type="button" disabled={!active} onClick={() => { cmd('jump', pickNode, 'Team moved'); setPickNode(null); }} data-a="t-jump">Send team here</button>
                  <button className="b2 sm" type="button" onClick={() => setPickNode(null)}>Cancel</button>
                </div>
                {active ? null : <p className="small" style={{ margin: '6px 0 0' }}>Only teams that are playing can be moved.</p>}
              </div>
            ) : <p className="small">Tap a step to move this team there.</p>}
          </div>
        ) : null}
        {active ? (
          <details className="more">
            <summary data-a="t-more">Surprise event for this team</summary>
            <div className="more-b">
              <div className="injgrid">
                {INJECTS.map((I) => <button key={I.id} className="b2 sm" type="button" title={I.prompt} onClick={() => cmd('inject', I.id, 'Surprise event sent')} data-a="t-inject" data-v={I.id}>{I.name}</button>)}
              </div>
              {t.prog?.pendingInject ? <p className="small" style={{ margin: '6px 0 0' }}>Waiting for them to answer: {injectById(t.prog.pendingInject)?.name}</p> : null}
            </div>
          </details>
        ) : null}
        {r && (G(D, t.game).insider || t.prog?.insider) ? (
          <div className="sec">
            <h3>Insider round</h3>
            <p style={{ margin: '0 0 8px' }}>
              {seats.length ? seats.map((x) => <span key={x.uid} className={'pill' + (ins && ins.member === x.uid ? ' ended' : '')} style={{ marginRight: 6 }}>{x.seat}{ins && ins.member === x.uid ? ' · INSIDER' : ''}{t.vote === x.uid ? ' · voted' : ''}</span>)
                : <span className="muted">No teammates joined yet.</span>}
            </p>
            {!ins ? (seats.length >= 2 ? <button className="b2 pri sm" type="button" onClick={() => { const x = dealTeam(D, t); say(x === 'ok' ? 'Roles dealt' : x === 'few' ? 'Need at least 2 teammates' : 'Already dealt'); }}>Deal roles for this team</button> : <span className="small">Waiting for at least 2 teammates to join.</span>)
              : ctl.reveal ? <span className={ctl.reveal.correct ? 'q-best' : 'q-poor'}>{ctl.reveal.correct ? 'Caught' : 'Escaped'}{ctl.reveal.voteSeat ? ' · voted ' + ctl.reveal.voteSeat : ' · no vote'}</span>
              : r.completed ? <button className="b2 pri sm" type="button" onClick={() => { if (revealInsider(D, t)) say('Insider revealed'); }}>Reveal the Insider{t.vote ? '' : ' (no vote yet)'}</button>
              : <span className="small">Reveal unlocks when they finish and vote.</span>}
          </div>
        ) : null}
        <details className="more">
          <summary>Activity</summary>
          <div className="more-b">
            <div className="tlog">{tl.length ? tl.map((l, i) => <div key={i}><time>{clock(l.at)}</time><strong>{LOG_TEXT[l.type] || l.type}</strong> {l.detail}</div>) : <div className="muted">Nothing yet.</div>}</div>
          </div>
        </details>
        <div className="sec danger">
          {confirm === 'trm:' + uid
            ? <><span>Remove {t.name} and its progress? </span><button className="b2 warn sm" type="button" onClick={() => { cmd('remove', undefined, 'Team removed'); onClose(); }} data-a="t-remove">Yes, remove</button><button className="b2 sm" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
            : <button className="linkish danger" type="button" onClick={() => setConfirm('trm:' + uid)} data-a="t-removeq">Remove this team</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- results ---------- */
function ResultsTab({ D, now, gid, setGid, setProj, say }: { D: Data; now: number; gid: string; setGid: (g: string) => void; setProj: SetProj; say: (m: string) => void }) {
  return (
    <>
      <div className="toolbar">
        <select className="sel" value={gid} onChange={(ev) => setGid(ev.target.value)} aria-label="Game">
          <option value="all">Whole event: the three winners</option>
          {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <span className="sp" />
        <button className="b2" type="button" onClick={() => setProj({ kind: 'board', gid })} data-a="proj-results">Show on big screen</button>
        <button className="b2" type="button" onClick={() => { if (!downloadText('breach-room-results.csv', resultsCsv(D, now))) void copyText(resultsCsv(D, now)).then(() => say('Copied. Paste into Excel.')); }}><Download size={15} aria-hidden /> Download results</button>
      </div>
      <p className="small">Score = final time ÷ the game’s par time, so teams on different games compare fairly. Lowest score wins. Ties go to fewer wrong answers, then fewer lifelines, then the earlier finish. Teams that didn’t close the case rank below those that did. ⚑ marks results worth a second look before you announce winners.</p>
      <Board S={D} gid={gid} now={now} />
    </>
  );
}

function LogTab({ D, filter, setFilter }: { D: Data; filter: string; setFilter: (f: string) => void }) {
  const rows = logRows(D);
  const shown = rows.filter((l) => filter === 'all' || l.game === filter).reverse().slice(0, 400);
  return (
    <>
      <div className="toolbar">
        <select className="sel" value={filter} onChange={(ev) => setFilter(ev.target.value)} aria-label="Filter by game">
          <option value="all">All games</option>
          {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <span className="small">{rows.length} entries in this session</span>
        <span className="sp" />
        <button className="b2" type="button" onClick={() => downloadText('breach-room-log.csv', logCsv(D))}><Download size={15} aria-hidden /> Download log</button>
      </div>
      {shown.length ? (
        <div className="log-wrap">
          <table className="ttable">
            <thead><tr><th>Time</th><th>Team</th><th>Game</th><th>Event</th><th>Detail</th></tr></thead>
            <tbody>{shown.map((l, i) => <tr key={i}><td className="mono" style={{ whiteSpace: 'nowrap' }}>{clock(l.at)}</td><td>{l.team}</td><td>{l.game ? gameById(l.game)?.title : ''}</td><td>{LOG_TEXT[l.type] || l.type}</td><td>{l.detail}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="empty">Every registration, key, answer, lifeline, decision and facilitator action is logged here.</div>}
    </>
  );
}

/** Which games new teams can be dealt. Default: the six games for everyone. */
function PoolCard({ D, say }: { D: Data; say: (m: string) => void }) {
  const pool = poolOf(D);
  const toggle = (id: string) => {
    const next = pool.includes(id) ? pool.filter((x) => x !== id) : [...pool, id];
    if (!next.length) { say('Keep at least one game'); return; }
    setPool(SCENARIOS.map((x) => x.id).filter((x) => next.includes(x)));
  };
  const isDefault = pool.length === DEFAULT_POOL.length && DEFAULT_POOL.every((g) => pool.includes(g));
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3>Games teams can get</h3>
      <p className="small">Each team is dealt one of these games when it registers: at random, but spread evenly, so every game gets about the same number of teams. Changes apply to teams that register from now on.</p>
      {SECTIONS.map((sec) => (
        <div key={sec.track} className="poolsec">
          <div className="side-h">{sec.label}</div>
          <div className="checks">
            {SCENARIOS.filter((x) => x.track === sec.track).map((x) => (
              <label key={x.id}><input type="checkbox" checked={pool.includes(x.id)} onChange={() => toggle(x.id)} data-a="pool" data-v={x.id} /> {x.title}</label>
            ))}
          </div>
        </div>
      ))}
      {isDefault ? null : <button className="b2 sm" type="button" onClick={() => { setPool(DEFAULT_POOL); say('Back to the six games for everyone'); }} data-a="pool-reset">Back to the six games for everyone</button>}
    </div>
  );
}

function SetupTab({ D, now, base, setBase, setProj, confirm, setConfirm, say }: { D: Data; now: number; base: string; setBase: (b: string) => void; setProj: SetProj; confirm: string | null; setConfirm: (v: string | null) => void; say: (m: string) => void }) {
  const [draft, setDraft] = useState(base);
  const [sname, setSname] = useState('');
  const [busy, setBusy] = useState(false);
  const demo = getStore().mode === 'demo';
  const url = base ? playUrl() : '';
  const total = teamList(D).length;
  return (
    <>
      <div className="setup2">
        <div className="card">
          <h3>Join QR code</h3>
          <p className="small">One QR code for the whole event. Put it on every table and on the big screen.</p>
          {url ? <QRBox value={url} size={160} label="QR code to join" /> : <p className="small">Set the game address below to make the QR code.</p>}
          {url ? <p className="url">{url}</p> : null}
          <div className="acts">
            <button className="b2 pri sm" type="button" disabled={!base} onClick={() => window.print()}><Printer size={14} aria-hidden /> Print table card</button>
            {url ? <button className="b2 sm" type="button" onClick={() => { void copyText(url).then((ok) => say(ok ? 'Link copied' : 'Couldn’t copy')); }}><Copy size={14} aria-hidden /> Copy link</button> : null}
            <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'lobby', gid: 'all' })}>Big screen</button>
          </div>
          <form className="field-inline" style={{ marginTop: 12 }} onSubmit={(ev) => { ev.preventDefault(); setBase(draft.trim()); }}>
            <input value={draft} onChange={(ev) => setDraft(ev.target.value)} placeholder="https://your-site.vercel.app" aria-label="Game address" />
            <button className="b2" type="submit">Save address</button>
          </form>
          <p className="small" style={{ marginTop: 6 }}>{demo ? 'Demo mode: type any address to preview the QR code.' : 'Fills in by itself. Change it only if you use a custom domain.'}</p>
        </div>
        <div className="card">
          <h3><Archive size={18} aria-hidden className="ico-in" /> Start a new session</h3>
          <p className="small">Saves this session to History, with every team, answer, report and result, then clears the board so you can play again. Nothing is deleted. Settings and the QR code stay the same.</p>
          <form className="field-inline" onSubmit={(ev) => { ev.preventDefault(); if (confirm !== 'newsess') { setConfirm('newsess'); return; } }}>
            <input value={sname} onChange={(ev) => setSname(ev.target.value)} placeholder="Name this session, e.g. Session 1 · Finance · 23 Oct" maxLength={60} aria-label="Session name" data-a="sessname" />
          </form>
          <div className="acts" style={{ marginTop: 8 }}>
            {confirm === 'newsess'
              ? <><span>Save “{sname.trim() || 'this session'}” ({total} teams) and clear the board?</span>
                <button className="b2 pri" type="button" disabled={busy} onClick={() => { setBusy(true); void newSession(D, sname, now).then(() => { setBusy(false); setConfirm(null); setSname(''); say('Session saved to History. The board is clear.'); }, () => { setBusy(false); say('Couldn’t save the session. Nothing was cleared.'); }); }} data-a="sessgo">Yes, save and start fresh</button>
                <button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
              : <button className="b2 pri" type="button" onClick={() => setConfirm('newsess')} data-a="sessq">Save and start a new session</button>}
          </div>
        </div>
      </div>
      <PoolCard D={D} say={say} />
      <div className="card" style={{ marginTop: 14 }}>
        <h3>Games and par times</h3>
        <p className="small">Par is a typical good time for each game (default {fmt(DEFAULT_PAR)}). Scores compare each team’s final time with its game’s par, so the three winners are fair across games. Every team has {LIMIT_S / 60} minutes of clock time. Set par before the event, and adjust it after a dry run.</p>
        <div className="log-wrap">
          <table className="ttable partable">
            <thead><tr><th>Game</th><th>Round</th><th>Par</th><th>Mode</th></tr></thead>
            <tbody>
              {SCENARIOS.map((s) => {
                const g = G(D, s.id), par = parOf(D, s.id);
                return (
                  <tr key={s.id}>
                    <td><b>{s.title}</b></td><td>{TRACKS[s.track]}</td>
                    <td><div className="acts">
                      <button className="b2 sm" type="button" onClick={() => setPar(D, s.id, par - 30)} aria-label={'Par for ' + s.title + ' down 30 seconds'}>−</button>
                      <span className="mono">{fmt(par)}</span>
                      <button className="b2 sm" type="button" onClick={() => setPar(D, s.id, par + 30)} aria-label={'Par for ' + s.title + ' up 30 seconds'}>+</button>
                    </div></td>
                    <td>{MODES[(g.mode || 'std') as 'std' | 'x'].label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
