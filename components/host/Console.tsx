'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, Copy, Download, Printer, RefreshCw } from 'lucide-react';
import { SCENARIOS, INJECTS } from '@/data/scenarios';
import { MODES, LOG_TEXT, LOCK_COUNT, fmt, clock, gameById, graph, injectById, lockNumber, type NodeId } from '@/lib/game';
import { getStore, setWriteErrorHandler, lsGet, lsSet, SS } from '@/lib/store';
import { baseUrl, go, setBaseUrl, playUrl } from '@/lib/nav';
import { useNow } from '@/lib/hooks';
import { Shield, Pill, QRBox, Html } from '@/components/ui';
import { DemoStrip } from '@/components/DemoStrip';
import Tree from './Tree';
import Projector, { Board, type ProjKind } from './Projector';
import {
  useConsoleData, G, teamsOf, prog, ctlOf, tStatus, liveTime, counts, seatsOf, logRows, GS_LABEL, ST_LABEL,
  setGameState, setMode, setInsider, newRoomCode, startAll, teamCmd, broadcast, injectAll, resetEvent, dealTeam, dealRoles,
  revealInsider, revealAll, resultsCsv, logCsv, downloadText, copyText, type Data, type Team, type TeamCmd,
} from './data';

type Tab = 'live' | 'board' | 'log' | 'setup';
type SetProj = (p: { kind: ProjKind; gid: string } | null) => void;
const TABS: [Tab, string][] = [['live', 'Games'], ['board', 'Results'], ['log', 'Log'], ['setup', 'Setup']];

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
        ? 'The database refused a change. Check that the rules are published and that FACILITATOR_EMAIL in them is exactly the email you signed in with.'
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
          {TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-a="tab" data-v={k}>{l}</button>
          ))}
        </div>
        {tab === 'live' ? (sel === 'all' ? <Overview D={D} setSel={setSel} setProj={setProj} confirm={confirm} setConfirm={setConfirm} say={say} />
          : <GameView D={D} gid={sel} now={now} say={say} setProj={setProj} confirm={confirm} setConfirm={setConfirm} openTeam={(u) => { setTeam(u); setPickNode(null); }} selTeam={team} />)
          : tab === 'board' ? <BoardTab D={D} gid={boardGame} setGid={setBoardGame} setProj={setProj} say={say} />
          : tab === 'log' ? <LogTab D={D} filter={logFilter} setFilter={setLogFilter} say={say} />
          : <SetupTab D={D} base={base} setBase={(b) => { setBaseRaw(b); lsSet('kbr-base', b); say('Address saved'); }} setProj={setProj} confirm={confirm} setConfirm={setConfirm} say={say} />}
      </div>
      {team && D.teams[team] ? <Drawer D={D} uid={team} now={now} pickNode={pickNode} setPickNode={setPickNode} confirm={confirm} setConfirm={setConfirm} say={say} onClose={() => { setTeam(null); setPickNode(null); }} /> : null}
      {proj ? <Projector D={D} kind={proj.kind} gid={proj.gid} base={base} onClose={() => setProj(null)} /> : null}
      <div id="print">
        {base ? SCENARIOS.map((s, i) => {
          const g = G(D, s.id);
          return g.room ? (
            <div key={s.id} className="pcard">
              <div className="pk">KAVACH BREACH ROOM · GAME {i + 1}</div><h2>{s.title}</h2>
              <QRBox value={playUrl({ room: g.room })} size={240} />
              <p>Scan with your phone, or go to <b>{base.replace(/^https?:\/\//, '')}</b> and enter room code <b>{g.room}</b></p>
            </div>
          ) : null;
        }) : null}
      </div>
    </>
  );
}

/* ---------- all games ---------- */
function Overview({ D, setSel, setProj, confirm, setConfirm, say }: { D: Data; setSel: (v: string) => void; setProj: SetProj; confirm: string | null; setConfirm: (v: string | null) => void; say: (m: string) => void }) {
  const all = counts(D, 'all');
  const firstDev = SCENARIOS.findIndex((s) => s.track === 'dev');
  const states = SCENARIOS.map((s) => G(D, s.id).state || 'closed');
  const anyOpen = states.includes('open'), anyPaused = states.includes('paused'), anyLive = anyOpen || anyPaused;
  const allState = (v: string) => {
    let n = 0;
    SCENARIOS.forEach((s) => {
      const st = G(D, s.id).state || 'closed';
      if (v === 'open' && (st === 'closed' || st === 'ended')) { setGameState(D, s.id, 'open'); n++; }
      if (v === 'paused' && st === 'open') { setGameState(D, s.id, 'paused'); n++; }
      if (v === 'resume' && st === 'paused') { setGameState(D, s.id, 'open'); n++; }
      if (v === 'ended' && st !== 'ended' && st !== 'closed') { setGameState(D, s.id, 'ended'); n++; }
    });
    setConfirm(null);
    say(n + ' game' + (n === 1 ? '' : 's') + ' updated');
  };
  return (
    <>
      <div className="toolbar">
        <p className="sumline"><b>{all.total}</b> teams · {all.waiting} waiting · {all.playing + all.paused} playing · {all.finished + all.stopped} finished</p>
        <span className="sp" />
        <button className="b2" type="button" onClick={() => allState('open')}>Open all</button>
        {anyOpen ? <button className="b2" type="button" onClick={() => allState('paused')}>Pause all</button>
          : anyPaused ? <button className="b2" type="button" onClick={() => allState('resume')}>Resume all</button> : null}
        {anyLive ? (confirm === 'endall'
          ? <><button className="b2 warn" type="button" onClick={() => allState('ended')}>Yes, end all</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
          : <button className="b2 warn" type="button" onClick={() => setConfirm('endall')}>End all</button>) : null}
        <button className="b2" type="button" onClick={() => setProj({ kind: 'race', gid: 'all' })} data-a="race-all">Live race, all games</button>
      </div>
      <div className="glist">
        {SCENARIOS.map((s, i) => {
          const g = G(D, s.id), c = counts(D, s.id), st = g.state || 'closed';
          return (
            <div key={s.id}>
              {i === firstDev ? <div className="side-h">Reserve · developer round</div> : null}
              <div className="grow">
                <button type="button" className="gmain" onClick={() => setSel(s.id)} data-a="sel" data-v={s.id}>
                  <span className="gnum">{i + 1}</span>
                  <span className="gt"><b>{s.title}</b><small>{s.threat}</small></span>
                </button>
                <Pill kind={st}>{GS_LABEL[st]}</Pill>
                <span className="gmeta">{g.room ? 'Room ' + g.room : ''}{c.total ? ' · ' + c.total + ' team' + (c.total === 1 ? '' : 's') : ''}</span>
                {st === 'closed' || st === 'ended'
                  ? <button className="b2 sm" type="button" onClick={() => setGameState(D, s.id, 'open')} data-a="gstate" data-g={s.id} data-v="open">Open</button>
                  : <button className="b2 sm" type="button" onClick={() => setGameState(D, s.id, 'closed')}>Close</button>}
                <button className="b2 sm ic" type="button" onClick={() => setSel(s.id)} aria-label={'Manage ' + s.title}><ChevronRight size={16} aria-hidden /></button>
              </div>
            </div>
          );
        })}
      </div>
    </>
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
  const g = G(D, gid), list = teamsOf(D, gid), c = counts(D, gid);
  const url = g.room ? playUrl({ room: g.room }) : '';
  const demo = getStore().mode === 'demo';
  const st = g.state || 'closed';
  return (
    <>
      <div className="ghead">
        <h2>{s.title}</h2>
        <Pill kind={st}>{GS_LABEL[st]}</Pill>
        <span className="sp" />
        <div className="seg" role="group" aria-label="Difficulty">
          <button type="button" aria-pressed={g.mode !== 'x'} onClick={() => setMode(D, gid, 'std')} data-a="gmode" data-v="std">Standard</button>
          <button type="button" aria-pressed={g.mode === 'x'} onClick={() => setMode(D, gid, 'x')} data-a="gmode" data-v="x">Expert</button>
        </div>
      </div>
      <div className="toolbar">
        {st === 'closed' || st === 'ended' ? <button className="b2 good" type="button" onClick={() => { setGameState(D, gid, 'open'); say(s.title + ': registration open'); }} data-a="gstate" data-g={gid} data-v="open">Open registration</button>
          : <button className="b2 pri" type="button" disabled={!c.waiting} onClick={() => { const n = startAll(D, gid); say(n ? 'Launched ' + n + ' team' + (n === 1 ? '' : 's') : 'No teams are waiting'); }} data-a="startall">Launch all waiting ({c.waiting})</button>}
        {st === 'paused' ? <button className="b2 good" type="button" onClick={() => setGameState(D, gid, 'open')} data-a="gstate" data-g={gid} data-v="resume">Resume</button>
          : st === 'open' ? <button className="b2" type="button" onClick={() => setGameState(D, gid, 'paused')} data-a="gstate" data-g={gid} data-v="paused">Pause</button> : null}
        {st === 'open' || st === 'paused' ? (confirm === 'end:' + gid
          ? <><button className="b2 warn" type="button" onClick={() => { setGameState(D, gid, 'ended'); setConfirm(null); }} data-a="endyes">Yes, end for everyone</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
          : <button className="b2 warn" type="button" onClick={() => setConfirm('end:' + gid)} data-a="end">End game</button>) : null}
      </div>
      <div className="joinbar">
        {url && !demo ? <QRBox value={url} size={84} label={'QR code for ' + s.title} className="mini" /> : null}
        <div className="jroom">
          <span className="lbl">Room code</span>
          <span className="bigroom">{g.room || '····'}</span>
          {url ? <button className="linkish" type="button" onClick={() => { void copyText(url).then((ok) => say(ok ? 'Link copied' : 'Couldn’t copy')); }}><Copy size={13} aria-hidden /> Copy link</button> : null}
        </div>
        <span className="sp" />
        <div className="screens" role="group" aria-label="Show on the big screen">
          <span className="lbl">Big screen</span>
          <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'lobby', gid })} data-a="proj-lobby">Lobby + QR</button>
          <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'race', gid })} data-a="proj-race">Live race</button>
          <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'reveal', gid })} data-a="proj-reveal">Answers</button>
          <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'board', gid })} data-a="proj-board">Leaderboard</button>
        </div>
      </div>
      {list.length ? (
        <div className="log-wrap">
          <table className="ttable">
            <thead><tr><th>Team</th><th>Status</th><th>Where</th><th>Time</th><th>Wrong</th><th /></tr></thead>
            <tbody>
              {list.map((t) => {
                const p = prog(t), stt = tStatus(D, t), code = D.secrets[t.uid]?.code, ctl = ctlOf(D, t.uid);
                let where: ReactNode = stt === 'waiting' ? <>Code <span className="code4">{code || '…'}</span></>
                  : p.pendingInject ? <span className="q-poor">Surprise: {injectById(p.pendingInject)?.name}</span> : <Html html={p.nodeName || ''} />;
                if (stt === 'finished' || stt === 'stopped') where = p.outcome || '';
                const sn = seatsOf(D, t.uid).length, ins = D.insiders[t.uid];
                return (
                  <tr key={t.uid} className={selTeam === t.uid ? 'sel' : ''}>
                    <td><button type="button" className="tn" onClick={() => openTeam(t.uid)} data-a="open" data-v={t.uid}>{t.name}</button></td>
                    <td><Pill kind={stt}>{ST_LABEL[stt] || stt}</Pill></td>
                    <td>{where}{g.insider || p.insider ? <div className="small">{sn} teammate{sn === 1 ? '' : 's'}{ins ? ' · roles dealt' : ''}{t.vote ? ' · voted' : ''}{ctl.reveal ? ' · revealed' : ''}</div> : null}</td>
                    <td className="mono">{p.startedAt ? fmt(liveTime(D, t, now)) : '—'}</td>
                    <td className="mono">{p.wrong || 0}</td>
                    <td><div className="acts end">
                      {stt === 'waiting' ? <button className="b2 pri sm" type="button" onClick={() => { teamCmd(D, t.uid, 'launch'); say('Launched ' + t.name); }} data-a="launch">Launch</button>
                        : stt === 'playing' || stt === 'paused' ? <button className="b2 sm" type="button" onClick={() => teamCmd(D, t.uid, 'pause')}>{ctl.pause ? 'Resume' : 'Pause'}</button> : null}
                      <button className="b2 sm" type="button" onClick={() => openTeam(t.uid)} data-a="control">Control</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <div className="empty">{st === 'open' ? 'No teams yet. Show the lobby on the big screen; teams appear here as they register.' : 'Open registration, then show the lobby on the big screen. Teams appear here as they register.'}</div>}
      <details className="more" open={g.insider ? true : undefined}>
        <summary data-a="more">More: message everyone, surprise events, Insider round</summary>
        <div className="more-b">
          <h4>Message every team</h4>
          <form className="msgrow" onSubmit={(ev) => { ev.preventDefault(); if (bc.trim()) { const n = broadcast(D, gid, bc.trim()); setBc(''); say('Message sent to ' + n + ' team' + (n === 1 ? '' : 's')); } }}>
            <input placeholder="e.g. Five minutes left!" maxLength={140} value={bc} onChange={(ev) => setBc(ev.target.value)} aria-label="Message to all teams" />
            <button className="b2" type="submit">Send</button>
          </form>
          <h4>Surprise event for every team playing</h4>
          <div className="acts">
            {INJECTS.map((I) => <button key={I.id} className="b2 sm" type="button" title={I.prompt} onClick={() => { const n = injectAll(D, gid, I.id); say(I.name + ' sent to ' + n + ' team' + (n === 1 ? '' : 's')); }}>{I.name}</button>)}
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
                <button className="b2" type="button" onClick={() => { const n = revealAll(D, gid); say(n ? 'Revealed for ' + n + ' team' + (n === 1 ? '' : 's') : 'Nothing to reveal yet: teams reveal after they finish'); }} data-a="revealall">Reveal Insiders</button>
              </>
            ) : null}
          </div>
          <p className="small">{g.insider ? 'Turn on before teams register. Teammates scan the code on their team’s phone; deal roles before you launch.' : 'A reserve twist: one teammate secretly works against the team, and teams vote at the end.'}</p>
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
  const t: Team = { uid, ...D.teams[uid] }, p = prog(t), st = tStatus(D, t), ctl = ctlOf(D, uid), s = gameById(t.game), code = D.secrets[uid]?.code;
  const active = st === 'playing' || st === 'paused';
  const cmd = (c: TeamCmd, arg?: string | number, label?: string) => { teamCmd(D, uid, c, arg); setConfirm(null); if (label) say(label); };
  const tl = logRows(D).filter((l) => l.uid === uid).slice(-40).reverse();
  const seats = seatsOf(D, uid), ins = D.insiders[uid];
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  if (!s) return null;
  const gr = graph(t.game), node = p.node ? gr[p.node as NodeId] : null;
  const where = st === 'waiting' ? 'Waiting to start' : st === 'finished' || st === 'stopped' ? p.outcome || ST_LABEL[st] : node ? (node.type === 'decision' || node.id === 'X' ? lockNumber(node) : lockNumber(node) + ' of ' + LOCK_COUNT) + ': ' + (node.type === 'end' ? '' : node.name) : '';
  return (
    <div className="drawer" role="dialog" aria-label="Team control">
      <div className="drawer-h">
        <button className="b2 sm" type="button" onClick={onClose} data-a="close"><ArrowLeft size={15} aria-hidden /> Back</button>
        <h2>{t.name}</h2>
        <Pill kind={st}>{ST_LABEL[st] || st}</Pill>
      </div>
      <div className="drawer-b">
        <div className="dsum">
          <div className="bigtime">{p.startedAt ? fmt(liveTime(D, t, now)) : '—'}</div>
          <div>
            <div className="dwhere">{where}</div>
            <div className="small">{s.title} · {MODES[(p.mode || G(D, t.game).mode || 'std') as 'std' | 'x'].label} · {p.wrong || 0} wrong · {p.pen || 0}s added{ctl.adj ? ' · ' + (ctl.adj > 0 ? '+' : '') + ctl.adj + 's by you' : ''}</div>
          </div>
        </div>
        {st === 'waiting' ? (
          <div className="sec">
            <p style={{ margin: '0 0 8px' }}>Launch code <span className="code4">{code || '…'}</span></p>
            <div className="acts"><button className="b2 pri" type="button" onClick={() => cmd('launch', undefined, 'Launched')} data-a="t-launch">Launch now</button><button className="b2" type="button" onClick={() => cmd('newcode', undefined, 'New code issued')}>New code</button></div>
          </div>
        ) : null}
        {active ? (
          <div className="sec">
            <div className="acts">
              <button className="b2" type="button" onClick={() => cmd('pause', undefined, 'Done')} data-a="t-pause">{ctl.pause ? 'Resume' : 'Pause'}</button>
              <button className="b2" type="button" onClick={() => cmd('hint', undefined, 'Free hint sent')} data-a="t-hint">Send a hint</button>
              {confirm === 'tend:' + uid
                ? <><button className="b2 warn" type="button" onClick={() => cmd('end', undefined, 'Game ended for that team')} data-a="t-end">Yes, end their game</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
                : <button className="b2 warn" type="button" onClick={() => setConfirm('tend:' + uid)} data-a="t-endq">End their game</button>}
            </div>
          </div>
        ) : null}
        <div className="sec">
          <div className="acts">
            <span className="lbl">Time</span>
            <button className="b2 sm" type="button" onClick={() => cmd('adj', -30, 'Time adjusted')}>−30s</button>
            <button className="b2 sm" type="button" onClick={() => cmd('adj', 30, 'Time adjusted')}>+30s</button>
            <button className="b2 sm" type="button" onClick={() => cmd('adj', 60, 'Time adjusted')}>+1 min</button>
          </div>
        </div>
        <div className="sec">
          <form className="msgrow" onSubmit={(ev) => { ev.preventDefault(); if (msg.trim()) { cmd('msg', msg.trim(), 'Message sent'); setMsg(''); } }}>
            <input maxLength={140} placeholder="Message this team" value={msg} onChange={(ev) => setMsg(ev.target.value)} aria-label="Message" data-a="t-msginput" />
            <button className="b2" type="submit" data-a="t-msg">Send</button>
          </form>
        </div>
        <div className="sec">
          <h3>Game tree</h3>
          <Tree gid={t.game} p={p} picked={pickNode} onPick={setPickNode} />
          {pickNode ? (
            <div className="note-box">Send this team to <strong>{gr[pickNode].label}</strong>?
              <div className="acts" style={{ marginTop: 6 }}>
                <button className="b2 pri sm" type="button" disabled={!active} onClick={() => { cmd('jump', pickNode, 'Team moved'); setPickNode(null); }} data-a="t-jump">Send team here</button>
                <button className="b2 sm" type="button" onClick={() => setPickNode(null)}>Cancel</button>
              </div>
              {active ? null : <p className="small" style={{ margin: '6px 0 0' }}>Only teams that are playing can be moved.</p>}
            </div>
          ) : <p className="small">Tap a step to move this team there.</p>}
        </div>
        <details className="more">
          <summary data-a="t-more">Surprise event for this team</summary>
          <div className="more-b">
            <div className="injgrid">
              {INJECTS.map((I) => <button key={I.id} className="b2 sm" type="button" disabled={!active} title={I.prompt} onClick={() => cmd('inject', I.id, 'Surprise event sent')} data-a="t-inject" data-v={I.id}>{I.name}</button>)}
            </div>
            {p.pendingInject ? <p className="small" style={{ margin: '6px 0 0' }}>Waiting for them to answer: {injectById(p.pendingInject)?.name}</p> : null}
          </div>
        </details>
        {G(D, t.game).insider || p.insider ? (
          <div className="sec">
            <h3>Insider round</h3>
            <p style={{ margin: '0 0 8px' }}>
              {seats.length ? seats.map((x) => <span key={x.uid} className={'pill' + (ins && ins.member === x.uid ? ' ended' : '')} style={{ marginRight: 6 }}>{x.seat}{ins && ins.member === x.uid ? ' · INSIDER' : ''}{t.vote === x.uid ? ' · voted' : ''}</span>)
                : <span className="muted">No teammates joined yet.</span>}
            </p>
            {!ins ? (seats.length >= 2 ? <button className="b2 pri sm" type="button" onClick={() => { const r = dealTeam(D, t); say(r === 'ok' ? 'Roles dealt' : r === 'few' ? 'Need at least 2 teammates' : 'Already dealt'); }}>Deal roles for this team</button> : <span className="small">Waiting for at least 2 teammates to join.</span>)
              : ctl.reveal ? <span className={ctl.reveal.correct ? 'q-best' : 'q-poor'}>{ctl.reveal.correct ? 'Caught' : 'Escaped'}{ctl.reveal.voteSeat ? ' · voted ' + ctl.reveal.voteSeat : ' · no vote'}</span>
              : p.status === 'finished' ? <button className="b2 pri sm" type="button" onClick={() => { if (revealInsider(D, t)) say('Insider revealed'); }}>Reveal the Insider{t.vote ? '' : ' (no vote yet)'}</button>
              : <span className="small">Reveal unlocks when they finish and vote.</span>}
          </div>
        ) : null}
        <details className="more">
          <summary>Decisions and activity</summary>
          <div className="more-b">
            {p.choices?.length ? <ul className="choicelog">{p.choices.map((c: { q: string; label: string }, i: number) => <li key={i}><span className={'q-' + c.q}>{c.q.toUpperCase()}</span> <Html html={c.label} /></li>)}</ul> : null}
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
function BoardTab({ D, gid, setGid, setProj, say }: { D: Data; gid: string; setGid: (g: string) => void; setProj: SetProj; say: (m: string) => void }) {
  return (
    <>
      <div className="toolbar">
        <select className="sel" value={gid} onChange={(ev) => setGid(ev.target.value)} aria-label="Game">
          <option value="all">All games</option>
          {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <span className="sp" />
        <button className="b2" type="button" onClick={() => setProj({ kind: 'board', gid })}>Show on big screen</button>
        <button className="b2" type="button" onClick={() => { if (!downloadText('breach-room-results.csv', resultsCsv(D))) void copyText(resultsCsv(D)).then(() => say('Copied. Paste into Excel.')); }}><Download size={15} aria-hidden /> Download results</button>
      </div>
      <p className="small">Lowest final time wins. Final time is the clock plus penalties and your adjustments. Teams that didn’t close the case rank below those that did.</p>
      <Board D={D} gid={gid} />
    </>
  );
}

function LogTab({ D, filter, setFilter, say }: { D: Data; filter: string; setFilter: (f: string) => void; say: (m: string) => void }) {
  const rows = logRows(D);
  const shown = rows.filter((l) => filter === 'all' || l.game === filter).reverse().slice(0, 400);
  return (
    <>
      <div className="toolbar">
        <select className="sel" value={filter} onChange={(ev) => setFilter(ev.target.value)} aria-label="Filter by game">
          <option value="all">All games</option>
          {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <span className="small">{rows.length} entries</span>
        <span className="sp" />
        <button className="b2" type="button" onClick={() => { if (!downloadText('breach-room-log.csv', logCsv(D))) void copyText(logCsv(D)).then(() => say('Copied. Paste into Excel.')); }}><Download size={15} aria-hidden /> Download log</button>
      </div>
      {shown.length ? (
        <div className="log-wrap">
          <table className="ttable">
            <thead><tr><th>Time</th><th>Team</th><th>Game</th><th>Event</th><th>Detail</th></tr></thead>
            <tbody>{shown.map((l, i) => <tr key={i}><td className="mono" style={{ whiteSpace: 'nowrap' }}>{clock(l.at)}</td><td>{l.team}</td><td>{l.game ? gameById(l.game)?.title : ''}</td><td>{LOG_TEXT[l.type] || l.type}</td><td>{l.detail}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="empty">Every registration, code, answer, lifeline, decision and facilitator action is logged here.</div>}
    </>
  );
}

function SetupTab({ D, base, setBase, setProj, confirm, setConfirm, say }: { D: Data; base: string; setBase: (b: string) => void; setProj: SetProj; confirm: string | null; setConfirm: (v: string | null) => void; say: (m: string) => void }) {
  const [draft, setDraft] = useState(base);
  const demo = getStore().mode === 'demo';
  return (
    <>
      <div className="card">
        <h3>Game address</h3>
        <p className="small">{demo ? 'Demo mode: there’s no public address yet. Type any web address to preview the QR codes.' : 'Where this game is hosted. QR codes point here. It fills in by itself.'}</p>
        <form className="field-inline" onSubmit={(ev) => { ev.preventDefault(); setBase(draft.trim()); }}>
          <input value={draft} onChange={(ev) => setDraft(ev.target.value)} placeholder="https://your-site.vercel.app" aria-label="Game address" />
          <button className="b2" type="submit">Save</button>
        </form>
      </div>
      <div className="toolbar" style={{ marginTop: 14 }}>
        <b>QR codes and room codes</b>
        <span className="sp" />
        <button className="b2 pri" type="button" disabled={!base} onClick={() => window.print()}><Printer size={15} aria-hidden /> Print table cards</button>
      </div>
      <div className="setgrid">
        {SCENARIOS.map((s, i) => {
          const g = G(D, s.id), u = g.room && base ? playUrl({ room: g.room }) : '';
          return (
            <div key={s.id} className="card">
              <span className="small">Game {i + 1}</span>
              <h3>{s.title}</h3>
              <p style={{ margin: 0 }}>Room <span className="bigroom">{g.room || '····'}</span></p>
              {u ? <QRBox value={u} size={140} label={'QR code for ' + s.title} /> : <p className="small">Set the game address above to make QR codes.</p>}
              <div className="acts">
                <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'lobby', gid: s.id })}>Big screen</button>
                {u ? <button className="b2 sm" type="button" onClick={() => { void copyText(u).then((ok) => say(ok ? 'Link copied' : 'Couldn’t copy')); }}>Copy link</button> : null}
                <button className="b2 sm" type="button" title="Make a new room code (reprint this card)" onClick={() => { newRoomCode(D, s.id); say('New room code for ' + s.title + '. Reprint its card.'); }}><RefreshCw size={14} aria-hidden /> New code</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h3>Reset the event</h3>
        <p className="small">Deletes every team, launch code and log entry. Download the results and log first. Room codes stay the same, so printed cards keep working.</p>
        <div className="acts">
          {confirm === 'reset'
            ? <><span>Delete everything and start fresh?</span><button className="b2 warn" type="button" onClick={() => { resetEvent(D); setConfirm(null); say('Event reset'); }}>Yes, reset the event</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
            : <button className="b2 warn" type="button" onClick={() => setConfirm('reset')}>Reset event</button>}
        </div>
      </div>
    </>
  );
}
