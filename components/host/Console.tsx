'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Copy, Download, MonitorPlay, Printer, QrCode, RefreshCw, Trophy, Eye, Activity } from 'lucide-react';
import { SCENARIOS, INJECTS } from '@/data/scenarios';
import { MODES, LOG_TEXT, fmt, clock, gameById, graph, injectById, type NodeId } from '@/lib/game';
import { getStore, setWriteErrorHandler, lsGet, lsSet, SS } from '@/lib/store';
import { baseUrl, go, setBaseUrl } from '@/lib/nav';
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
import { playUrl } from '@/lib/nav';

type Tab = 'live' | 'board' | 'log' | 'setup';

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

  const backLabel = proj ? 'Close projector' : team ? 'Back to teams' : tab !== 'live' ? 'Back to live control' : sel !== 'all' ? 'All games' : 'Start page';
  const goBack = () => {
    if (proj) setProj(null);
    else if (team) { setTeam(null); setPickNode(null); }
    else if (tab !== 'live') setTab('live');
    else if (sel !== 'all') setSel('all');
    else go('/');
  };

  const all = counts(D, 'all');
  const firstDev = SCENARIOS.findIndex((s) => s.track === 'dev');

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
          <button type="button" className="cbtn" onClick={() => setProj({ kind: 'race', gid: sel })} data-a="race"><Activity size={16} aria-hidden /> Live race</button>
          <button type="button" className="cbtn" onClick={() => setProj({ kind: 'board', gid: 'all' })} data-a="projboard"><Trophy size={16} aria-hidden /> Leaderboard</button>
          <button type="button" className="cbtn" onClick={onSignOut} data-a="signout">Sign out</button>
        </div>
      </header>
      {writeErr ? <div className="errbar" role="alert"><strong>Changes aren’t being saved.</strong> {writeErr} <button className="b2 sm" type="button" onClick={() => setWriteErr('')}>Dismiss</button></div> : null}
      {store.mode === 'demo' && !store.persistent ? <div className="errbar" role="status"><strong>This preview blocks browser storage,</strong> so other tabs can’t see this dashboard’s data. Open it in a normal browser window to test with several tabs.</div> : null}
      <div className="cwrap">
        <aside className="cside">
          <button type="button" className="gitem" aria-current={sel === 'all'} onClick={() => { setSel('all'); setTab('live'); }} data-a="sel" data-v="all">
            <div className="gn"><b>All games</b><span>{all.total} teams · {all.playing + all.paused} playing · {all.finished + all.stopped} finished</span></div>
          </button>
          <div className="side-h">Games</div>
          {SCENARIOS.map((s, i) => {
            const g = G(D, s.id), c = counts(D, s.id);
            return (
              <div key={s.id}>
                {i === firstDev ? <div className="side-h">Reserve · developer round</div> : null}
                <button type="button" className="gitem" aria-current={sel === s.id} onClick={() => { setSel(s.id); setTab('live'); }} data-a="sel" data-v={s.id}>
                  <div className="gn"><b>{i + 1}. {s.title}</b><span><Pill kind={g.state || 'closed'}>{GS_LABEL[g.state || 'closed']}</Pill>{g.room ? <span className="roomtag">#{g.room}</span> : null}{g.mode === 'x' ? ' · Expert' : ''}</span></div>
                  <span className="cnt" title="Teams">{c.total}</span>
                </button>
              </div>
            );
          })}
        </aside>
        <main className="cmain">
          <div className="ctabs" role="tablist">
            {([['live', 'Live control'], ['board', 'Leaderboard'], ['log', 'Activity log'], ['setup', 'Setup & QR']] as [Tab, string][]).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-a="tab" data-v={k}>{l}</button>
            ))}
          </div>
          {tab === 'live' ? (sel === 'all' ? <Overview D={D} setSel={setSel} setProj={setProj} confirm={confirm} setConfirm={setConfirm} />
            : <GameView D={D} gid={sel} now={now} say={say} setSel={setSel} setTab={setTab} setProj={setProj} confirm={confirm} setConfirm={setConfirm} openTeam={(u) => { setTeam(u); setPickNode(null); }} selTeam={team} />)
            : tab === 'board' ? <BoardTab D={D} gid={boardGame} setGid={setBoardGame} setProj={setProj} say={say} />
            : tab === 'log' ? <LogTab D={D} filter={logFilter} setFilter={setLogFilter} say={say} />
            : <SetupTab D={D} base={base} setBase={(b) => { setBaseRaw(b); lsSet('kbr-base', b); say('Address saved'); }} setProj={setProj} confirm={confirm} setConfirm={setConfirm} say={say} />}
        </main>
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

type SetProj = (p: { kind: ProjKind; gid: string } | null) => void;

/* ---------- all games ---------- */
function Overview({ D, setSel, setProj, confirm, setConfirm }: { D: Data; setSel: (v: string) => void; setProj: SetProj; confirm: string | null; setConfirm: (v: string | null) => void }) {
  const all = counts(D, 'all');
  const allState = (v: string) => {
    SCENARIOS.forEach((s) => {
      const st = G(D, s.id).state || 'closed';
      if (v === 'open' && (st === 'closed' || st === 'ended')) setGameState(D, s.id, 'open');
      if (v === 'paused' && st === 'open') setGameState(D, s.id, 'paused');
      if (v === 'resume' && st === 'paused') setGameState(D, s.id, 'open');
      if (v === 'ended' && st !== 'ended' && st !== 'closed') setGameState(D, s.id, 'ended');
    });
    setConfirm(null);
  };
  return (
    <>
      <div className="stats">
        <div className="stat"><b>{all.total}</b><span>Teams registered</span></div>
        <div className="stat"><b>{all.waiting}</b><span>Waiting to launch</span></div>
        <div className="stat"><b>{all.playing + all.paused}</b><span>Playing now</span></div>
        <div className="stat"><b>{all.finished + all.stopped}</b><span>Finished</span></div>
      </div>
      <div className="ctrls">
        <span className="lbl">All games</span>
        <button className="b2" type="button" onClick={() => allState('open')}>Open all</button>
        <button className="b2" type="button" onClick={() => allState('paused')}>Pause all</button>
        <button className="b2" type="button" onClick={() => allState('resume')}>Resume all</button>
        {confirm === 'endall'
          ? <><span>End every game now?</span><button className="b2 warn" type="button" onClick={() => allState('ended')}>Yes, end all</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
          : <button className="b2 warn" type="button" onClick={() => setConfirm('endall')}>End all</button>}
        <button className="b2" type="button" onClick={() => setProj({ kind: 'race', gid: 'all' })}>Project live race</button>
      </div>
      <div className="ovw">
        {SCENARIOS.map((s, i) => {
          const g = G(D, s.id), c = counts(D, s.id);
          return (
            <div key={s.id} className="card">
              <span className="tag">Game {i + 1} · {s.company}{s.track === 'dev' ? ' · Developers' : ''}</span>
              <h3>{s.title}</h3>
              <p className="small" style={{ margin: '2px 0 8px' }}>{s.threat}</p>
              <p style={{ margin: '0 0 8px' }}><Pill kind={g.state || 'closed'}>{GS_LABEL[g.state || 'closed']}</Pill> {g.room ? <span className="roomtag">Room {g.room}</span> : null} <span className="muted">{c.total} teams · {c.waiting} waiting · {c.playing + c.paused} playing · {c.finished + c.stopped} done</span></p>
              <div className="acts">
                {g.state === 'closed' || g.state === 'ended' || !g.state
                  ? <button className="b2 pri sm" type="button" onClick={() => setGameState(D, s.id, 'open')} data-a="gstate" data-g={s.id} data-v="open">Open registration</button>
                  : <button className="b2 sm" type="button" onClick={() => setGameState(D, s.id, 'closed')}>Close</button>}
                <button className="b2 sm" type="button" onClick={() => setSel(s.id)}>Manage</button>
                <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'lobby', gid: s.id })}>Project lobby</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- one game ---------- */
function GameView({ D, gid, now, say, setSel, setTab, setProj, confirm, setConfirm, openTeam, selTeam }: {
  D: Data; gid: string; now: number; say: (m: string) => void; setSel: (v: string) => void; setTab: (t: Tab) => void; setProj: SetProj;
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
      <button type="button" className="linkback" onClick={() => setSel('all')}><ArrowLeft size={15} aria-hidden /> All games</button>
      <div className="ghead">
        <h2>{s.title}</h2>
        <Pill kind={st}>{GS_LABEL[st]}</Pill>
        <div className="seg" role="group" aria-label="Difficulty">
          <button type="button" aria-pressed={g.mode !== 'x'} onClick={() => setMode(D, gid, 'std')} data-a="gmode" data-v="std">Standard</button>
          <button type="button" aria-pressed={g.mode === 'x'} onClick={() => setMode(D, gid, 'x')} data-a="gmode" data-v="x">Expert</button>
        </div>
        <span className="small">{s.threat}</span>
      </div>
      <div className="ctrls">
        <span className="lbl">Game</span>
        {st === 'closed' || st === 'ended' ? <button className="b2 good" type="button" onClick={() => { setGameState(D, gid, 'open'); say(s.title + ': Open'); }} data-a="gstate" data-g={gid} data-v="open">Open registration</button>
          : st === 'paused' ? <button className="b2 good" type="button" onClick={() => setGameState(D, gid, 'open')} data-a="gstate" data-g={gid} data-v="resume">Resume game</button>
          : <button className="b2" type="button" onClick={() => setGameState(D, gid, 'paused')} data-a="gstate" data-g={gid} data-v="paused">Pause game</button>}
        <button className="b2 pri" type="button" disabled={!c.waiting} onClick={() => { const n = startAll(D, gid); say(n ? 'Launched ' + n + ' team' + (n === 1 ? '' : 's') : 'No teams are waiting'); }} data-a="startall">Launch all waiting ({c.waiting})</button>
        {st === 'ended' ? null : confirm === 'end:' + gid
          ? <><span>End for every team?</span><button className="b2 warn" type="button" onClick={() => { setGameState(D, gid, 'ended'); setConfirm(null); }} data-a="endyes">Yes, end game</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
          : <button className="b2 warn" type="button" onClick={() => setConfirm('end:' + gid)} data-a="end">End game</button>}
      </div>
      <div className="ctrls">
        <span className="lbl">Big screen</span>
        <button className="b2" type="button" onClick={() => setProj({ kind: 'lobby', gid })} data-a="proj-lobby"><QrCode size={16} aria-hidden /> Lobby: QR + room code</button>
        <button className="b2" type="button" onClick={() => setProj({ kind: 'race', gid })} data-a="proj-race"><Activity size={16} aria-hidden /> Live race</button>
        <button className="b2" type="button" onClick={() => setProj({ kind: 'reveal', gid })} data-a="proj-reveal"><Eye size={16} aria-hidden /> Answer reveal</button>
        <button className="b2" type="button" onClick={() => setProj({ kind: 'board', gid })} data-a="proj-board"><Trophy size={16} aria-hidden /> Leaderboard</button>
      </div>
      <div className="card gqr">
        {url && !demo ? <QRBox value={url} size={150} label={'QR code for ' + s.title} /> : null}
        <div>
          <h3>Room code <span className="bigroom">{g.room || '····'}</span></h3>
          {url && !demo ? <p className="url">{url}</p>
            : <p className="small" style={{ margin: '0 0 8px' }}>{demo ? 'Demo mode: teams join from another tab using this room code. Once hosted, the QR code shows here too.' : 'Generating a room code…'}</p>}
          <div className="acts">
            <button className="b2 pri sm" type="button" onClick={() => setProj({ kind: 'lobby', gid })}><MonitorPlay size={15} aria-hidden /> Show full screen</button>
            {url ? <button className="b2 sm" type="button" onClick={() => { void copyText(url).then((ok) => say(ok ? 'Link copied' : 'Couldn’t copy')); }}><Copy size={15} aria-hidden /> Copy link</button> : null}
            <button className="b2 sm" type="button" onClick={() => setTab('setup')}><Printer size={15} aria-hidden /> Print cards</button>
          </div>
        </div>
      </div>
      <div className="ctrls">
        <span className="lbl">Message all</span>
        <form className="msgrow" style={{ flex: 1, minWidth: 240 }} onSubmit={(ev) => { ev.preventDefault(); if (bc.trim()) { const n = broadcast(D, gid, bc.trim()); setBc(''); say('Message sent to ' + n + ' team' + (n === 1 ? '' : 's')); } }}>
          <input placeholder="e.g. Five minutes left!" maxLength={140} value={bc} onChange={(ev) => setBc(ev.target.value)} aria-label="Message to all teams" />
          <button className="b2" type="submit">Send</button>
        </form>
      </div>
      <div className="ctrls">
        <span className="lbl">Surprise event to all playing</span>
        {INJECTS.map((I) => <button key={I.id} className="b2 sm" type="button" title={I.prompt} onClick={() => { const n = injectAll(D, gid, I.id); say(I.name + ' sent to ' + n + ' team' + (n === 1 ? '' : 's')); }}>{I.name}</button>)}
      </div>
      <div className="ctrls insider-ctrl">
        <span className="lbl">Insider round</span>
        <div className="seg" role="group" aria-label="Insider round">
          <button type="button" aria-pressed={!g.insider} onClick={() => setInsider(D, gid, false)} data-a="ginsider" data-v="0">Off</button>
          <button type="button" aria-pressed={!!g.insider} onClick={() => setInsider(D, gid, true)} data-a="ginsider" data-v="1">On</button>
        </div>
        {g.insider ? (
          <>
            <button className="b2 pri" type="button" onClick={() => { const r = dealRoles(D, gid); say('Roles dealt to ' + r.n + ' team' + (r.n === 1 ? '' : 's') + (r.few ? ' · ' + r.few + ' waiting for 2+ teammates' : '')); }} data-a="deal">Deal secret roles</button>
            <button className="b2" type="button" onClick={() => { const n = revealAll(D, gid); say(n ? 'Revealed for ' + n + ' team' + (n === 1 ? '' : 's') : 'Nothing to reveal yet: teams reveal after they finish'); }} data-a="revealall">Reveal Insiders</button>
            <span className="small">Turn on before teams register. Teammates scan the code on their team’s phone; deal roles before you launch.</span>
          </>
        ) : <span className="small">Reserve twist: one teammate secretly works against the team, and teams vote at the end.</span>}
      </div>
      {list.length ? (
        <div className="log-wrap">
          <table className="ttable">
            <thead><tr><th>Team</th><th>Status</th><th>Code</th><th>Where they are</th><th>Time</th><th>Wrong</th><th>Lifelines</th><th /></tr></thead>
            <tbody>
              {list.map((t) => {
                const p = prog(t), stt = tStatus(D, t), code = D.secrets[t.uid]?.code, ctl = ctlOf(D, t.uid);
                let where: ReactNode = stt === 'waiting' ? <span className="muted">Registered {clock(t.joinedAt || 0)}</span>
                  : p.pendingInject ? <span className="q-poor">Surprise: {injectById(p.pendingInject)?.name}</span> : <Html html={p.nodeName || ''} />;
                if (stt === 'finished' || stt === 'stopped') where = p.outcome || '';
                const sn = seatsOf(D, t.uid).length, ins = D.insiders[t.uid];
                return (
                  <tr key={t.uid} className={selTeam === t.uid ? 'sel' : ''}>
                    <td><button type="button" className="tn" onClick={() => openTeam(t.uid)} data-a="open" data-v={t.uid}>{t.name}</button>{p.streak >= 2 ? <span className="streak sm">🔥{p.streak}</span> : null}</td>
                    <td><Pill kind={stt}>{ST_LABEL[stt] || stt}</Pill></td>
                    <td>{stt === 'waiting' ? <span className="code4">{code || '…'}</span> : <span className="muted">{p.status ? 'used' : '—'}</span>}</td>
                    <td>{where}{g.insider || p.insider ? <div className="small">{sn} teammate{sn === 1 ? '' : 's'} joined{ins ? ' · roles dealt' : ''}{t.vote ? ' · voted' : ''}{ctl.reveal ? ' · revealed' : ''}</div> : null}</td>
                    <td className="mono">{p.startedAt ? fmt(liveTime(D, t, now)) : '—'}</td>
                    <td className="mono">{p.wrong || 0}</td>
                    <td className="ll-cell">{p.askIt ? <span title="Ask IT used">IT</span> : null}{p.fifty ? <span title="50:50 used">50</span> : null}{!p.askIt && !p.fifty ? <span className="muted">—</span> : null}</td>
                    <td><div className="acts">
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
      ) : <div className="empty">{st === 'open' ? 'No teams yet. Show the QR code and room code; teams appear here as they register.' : 'Open registration, then show the QR code. Teams appear here as they register.'}</div>}
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
  return (
    <div className="drawer" role="dialog" aria-label="Team control">
      <div className="drawer-h">
        <button className="b2 sm" type="button" onClick={onClose} data-a="close"><ArrowLeft size={15} aria-hidden /> Back</button>
        <h2>{t.name}</h2>
        <Pill kind={st}>{ST_LABEL[st] || st}</Pill>
      </div>
      <div className="drawer-b">
        <p className="small" style={{ margin: 0 }}>{s.title} · {MODES[(p.mode || G(D, t.game).mode || 'std') as 'std' | 'x'].label} · registered {clock(t.joinedAt || 0)}{code ? <> · launch code <span className="code4">{code}</span></> : null}</p>
        <div className="sec">
          <div className="bigtime">{p.startedAt ? fmt(liveTime(D, t, now)) : '—'}</div>
          <p className="small" style={{ margin: '4px 0 0' }}>
            {p.wrong || 0} wrong · {p.pen || 0}s penalties · {(ctl.adj || 0) > 0 ? '+' : ''}{ctl.adj || 0}s adjusted · streak {p.streak || 0} (best {p.bestStreak || 0}) · Ask IT {p.askIt ? 'used' : 'unused'} · 50:50 {p.fifty ? 'used' : 'unused'}
            {p.outcome ? <> · <strong>{p.outcome}</strong></> : null}
          </p>
        </div>
        <div className="sec">
          <h3>Control</h3>
          <div className="acts">
            {st === 'waiting' ? <><button className="b2 pri" type="button" onClick={() => cmd('launch', undefined, 'Launched')} data-a="t-launch">Launch now</button><button className="b2" type="button" onClick={() => cmd('newcode', undefined, 'New code issued')}>New code</button></> : null}
            {active ? <><button className="b2" type="button" onClick={() => cmd('pause', undefined, 'Done')} data-a="t-pause">{ctl.pause ? 'Resume' : 'Pause'}</button><button className="b2" type="button" onClick={() => cmd('hint', undefined, 'Free hint sent')} data-a="t-hint">Free hint</button></> : null}
            <button className="b2" type="button" onClick={() => cmd('adj', -30, 'Time adjusted')}>−30s</button>
            <button className="b2" type="button" onClick={() => cmd('adj', 30, 'Time adjusted')}>+30s</button>
            <button className="b2" type="button" onClick={() => cmd('adj', 60, 'Time adjusted')}>+1 min</button>
            {active ? (confirm === 'tend:' + uid
              ? <><button className="b2 warn" type="button" onClick={() => cmd('end', undefined, 'Game ended for that team')} data-a="t-end">Yes, end their game</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
              : <button className="b2 warn" type="button" onClick={() => setConfirm('tend:' + uid)} data-a="t-endq">End their game</button>) : null}
            {confirm === 'trm:' + uid
              ? <><button className="b2 warn" type="button" onClick={() => { cmd('remove', undefined, 'Team removed'); onClose(); }} data-a="t-remove">Yes, remove team</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
              : <button className="b2 warn" type="button" onClick={() => setConfirm('trm:' + uid)} data-a="t-removeq">Remove</button>}
          </div>
        </div>
        <div className="sec">
          <h3>Message this team</h3>
          <form className="msgrow" onSubmit={(ev) => { ev.preventDefault(); if (msg.trim()) { cmd('msg', msg.trim(), 'Message sent'); setMsg(''); } }}>
            <input maxLength={140} placeholder="Shows as a banner on their screen" value={msg} onChange={(ev) => setMsg(ev.target.value)} aria-label="Message" data-a="t-msginput" />
            <button className="b2" type="submit" data-a="t-msg">Send</button>
          </form>
        </div>
        <div className="sec">
          <h3>Send a surprise event</h3>
          <div className="injgrid">
            {INJECTS.map((I) => <button key={I.id} className="b2 sm" type="button" disabled={!active} title={I.prompt} onClick={() => cmd('inject', I.id, 'Surprise event sent')} data-a="t-inject" data-v={I.id}>{I.name}</button>)}
          </div>
          {p.pendingInject ? <p className="small" style={{ margin: '6px 0 0' }}>Waiting for them to answer: {injectById(p.pendingInject)?.name}</p> : null}
        </div>
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
        <div className="sec">
          <h3>Game tree</h3>
          <Tree gid={t.game} p={p} picked={pickNode} onPick={setPickNode} />
          {pickNode ? (
            <div className="note-box">Send this team to <strong>{graph(t.game)[pickNode].label}</strong>?
              <div className="acts" style={{ marginTop: 6 }}>
                <button className="b2 pri sm" type="button" disabled={!active} onClick={() => { cmd('jump', pickNode, 'Team moved'); setPickNode(null); }} data-a="t-jump">Send team here</button>
                <button className="b2 sm" type="button" onClick={() => setPickNode(null)}>Cancel</button>
              </div>
              {active ? null : <p className="small" style={{ margin: '6px 0 0' }}>Only teams that are playing can be moved.</p>}
            </div>
          ) : <p className="small">Tap a step in the tree to move this team there.</p>}
        </div>
        {p.choices?.length ? (
          <div className="sec"><h3>Decisions made</h3><ul className="choicelog">{p.choices.map((c: { q: string; label: string }, i: number) => <li key={i}><span className={'q-' + c.q}>{c.q.toUpperCase()}</span> <Html html={c.label} /></li>)}</ul></div>
        ) : null}
        <div className="sec">
          <h3>Activity</h3>
          <div className="tlog">{tl.length ? tl.map((l, i) => <div key={i}><time>{clock(l.at)}</time><strong>{LOG_TEXT[l.type] || l.type}</strong> {l.detail}</div>) : <div className="muted">Nothing yet.</div>}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- leaderboard ---------- */
function BoardTab({ D, gid, setGid, setProj, say }: { D: Data; gid: string; setGid: (g: string) => void; setProj: SetProj; say: (m: string) => void }) {
  return (
    <>
      <div className="ctrls">
        <span className="lbl">Leaderboard</span>
        <select className="sel" value={gid} onChange={(ev) => setGid(ev.target.value)} aria-label="Game">
          <option value="all">All games</option>
          {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <button className="b2" type="button" onClick={() => setProj({ kind: 'board', gid })}>Project it</button>
        <button className="b2" type="button" onClick={() => setProj({ kind: 'race', gid })}>Project live race</button>
        <button className="b2" type="button" onClick={() => { if (!downloadText('breach-room-results.csv', resultsCsv(D))) void copyText(resultsCsv(D)).then(() => say('Copied')); }}><Download size={15} aria-hidden /> Results (CSV)</button>
        <button className="b2" type="button" onClick={() => { void copyText(resultsCsv(D)).then((ok) => say(ok ? 'Copied. Paste into Excel.' : 'Couldn’t copy')); }}><Copy size={15} aria-hidden /> Copy</button>
      </div>
      <p className="small">Ranked by final time: clock time plus penalties for wrong answers, risky decisions and surprise events, and your adjustments. Teams that didn’t close the case rank below those that did.</p>
      <Board D={D} gid={gid} />
    </>
  );
}

function LogTab({ D, filter, setFilter, say }: { D: Data; filter: string; setFilter: (f: string) => void; say: (m: string) => void }) {
  const rows = logRows(D);
  const shown = rows.filter((l) => filter === 'all' || l.game === filter).reverse().slice(0, 400);
  return (
    <>
      <div className="ctrls">
        <span className="lbl">Activity log</span>
        <select className="sel" value={filter} onChange={(ev) => setFilter(ev.target.value)} aria-label="Filter by game">
          <option value="all">All games</option>
          {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <button className="b2" type="button" onClick={() => { if (!downloadText('breach-room-log.csv', logCsv(D))) void copyText(logCsv(D)).then(() => say('Copied')); }}><Download size={15} aria-hidden /> Log (CSV)</button>
        <button className="b2" type="button" onClick={() => { void copyText(logCsv(D)).then((ok) => say(ok ? 'Copied. Paste into Excel.' : 'Couldn’t copy')); }}><Copy size={15} aria-hidden /> Copy</button>
        <span className="small">{rows.length} entries, saved {getStore().mode === 'live' ? 'in your database' : 'in this browser (demo)'}</span>
      </div>
      {shown.length ? (
        <div className="log-wrap">
          <table className="ttable">
            <thead><tr><th>Time</th><th>Team</th><th>Game</th><th>Event</th><th>Detail</th></tr></thead>
            <tbody>{shown.map((l, i) => <tr key={i}><td className="mono" style={{ whiteSpace: 'nowrap' }}>{clock(l.at)}</td><td>{l.team}</td><td>{l.game ? gameById(l.game)?.title : ''}</td><td>{LOG_TEXT[l.type] || l.type}</td><td>{l.detail}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="empty">Every registration, code, answer, lifeline, decision and facilitator action will be logged here.</div>}
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
        <p className="small">{demo ? 'Demo mode: there’s no public address yet. Type any web address to preview the QR codes.' : 'The address where this game is hosted. QR codes point to it. It fills in automatically.'}</p>
        <form className="field-inline" onSubmit={(ev) => { ev.preventDefault(); setBase(draft.trim()); }}>
          <input value={draft} onChange={(ev) => setDraft(ev.target.value)} placeholder="https://your-site.vercel.app" aria-label="Game address" />
          <button className="b2" type="submit">Save</button>
        </form>
      </div>
      <div className="ctrls" style={{ marginTop: 14 }}>
        <span className="lbl">QR codes and room codes</span>
        <button className="b2" type="button" disabled={!base} onClick={() => window.print()}><Printer size={15} aria-hidden /> Print table cards</button>
      </div>
      <div className="setgrid">
        {SCENARIOS.map((s, i) => {
          const g = G(D, s.id), u = g.room && base ? playUrl({ room: g.room }) : '';
          return (
            <div key={s.id} className="card">
              <span className="tag">Game {i + 1}</span>
              <h3>{s.title}</h3>
              <p style={{ margin: 0 }}>Room code <span className="bigroom">{g.room || '····'}</span></p>
              {u ? <><QRBox value={u} size={200} label={'QR code for ' + s.title} /><p className="url">{u}</p></> : <p className="small">Set the game address above to make QR codes.</p>}
              <div className="acts">
                <button className="b2 sm" type="button" onClick={() => setProj({ kind: 'lobby', gid: s.id })}>Project</button>
                {u ? <button className="b2 sm" type="button" onClick={() => { void copyText(u).then((ok) => say(ok ? 'Link copied' : 'Couldn’t copy')); }}>Copy link</button> : null}
                <button className="b2 sm" type="button" onClick={() => { newRoomCode(D, s.id); say('New room code for ' + s.title + '. Reprint its card.'); }}><RefreshCw size={14} aria-hidden /> New room code</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h3>Data</h3>
        <p className="small">{demo ? 'Demo data lives only in this browser.' : 'Connected to your Firebase database.'} Download the results and log before resetting. Room codes stay the same after a reset, so printed cards keep working.</p>
        <div className="acts">
          {confirm === 'reset'
            ? <><span>Delete every team, code and log entry?</span><button className="b2 warn" type="button" onClick={() => { resetEvent(D); setConfirm(null); say('Event reset'); }}>Yes, reset the event</button><button className="b2" type="button" onClick={() => setConfirm(null)}>Cancel</button></>
            : <button className="b2 warn" type="button" onClick={() => setConfirm('reset')}>Reset event</button>}
        </div>
      </div>
    </>
  );
}
