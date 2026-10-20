'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Trophy } from 'lucide-react';
import { gameById, graph, fmt, codeDisplay, isLockNode, MAIN_STEPS, REVEAL_ORDER, type GameNode } from '@/lib/game';
import type { Result } from '@/lib/scoring';
import { QRBox, Html } from '@/components/ui';
import { playUrl } from '@/lib/nav';
import { useNow } from '@/lib/hooks';
import { getStore } from '@/lib/store';
import { teamList, resultsOf, ST_LABEL, type Data, type Snap } from './data';

export type ProjKind = 'lobby' | 'race' | 'board' | 'reveal';

/** Full-screen views for the projector or a second screen. */
export default function Projector({ D, kind, gid, base, onClose }: { D: Data; kind: ProjKind; gid: string; base: string; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="projx" role="dialog" aria-label="Big screen">
      <div className="aurora" aria-hidden="true" />
      <button type="button" className="close" onClick={onClose} data-a="unproj"><ArrowLeft size={16} aria-hidden /> Back (Esc)</button>
      {kind === 'lobby' ? <Lobby D={D} base={base} /> : kind === 'race' ? <Race D={D} gid={gid} /> : kind === 'board' ? <BoardBig D={D} gid={gid} /> : <Reveal gid={gid} />}
    </div>
  );
}

function Lobby({ D, base }: { D: Data; base: string }) {
  const list = teamList(D);
  const seen = useRef<Record<string, boolean>>({});
  const demo = getStore().mode === 'demo';
  const url = base && !demo ? playUrl() : '';
  const open = D.event?.reg === 'open';
  return (
    <>
      <h1>Kavach Breach Room</h1>
      <p className="sub">{open ? 'Scan the QR code to register your team' : 'Registration opens soon'}</p>
      <div className="lobby">
        {url ? <QRBox value={url} size={420} label="QR code to join" /> : <div className="qrbox" style={{ padding: 40, lineHeight: 1.4, color: '#000', maxWidth: 420 }}>{demo ? 'Demo mode: teams join from another tab. Once hosted, the QR code shows here.' : 'Set the game address in Setup to show the QR code.'}</div>}
        <div className="joined">
          <div className="roomcode"><span>Or open</span><b className="addr">{(base || '').replace(/^https?:\/\//, '').replace(/\/$/, '')}/play</b></div>
          <h2>Teams registered: {list.length}</h2>
          <div className="chips">
            {list.map((t) => { const isNew = !seen.current[t.uid]; seen.current[t.uid] = true; return <span key={t.uid} className={'chip' + (isNew ? ' new' : '')}>{t.name}</span>; })}
          </div>
        </div>
      </div>
    </>
  );
}

function Race({ D, gid }: { D: Data; gid: string }) {
  const now = useNow(1000);
  const list = resultsOf(D, gid, now).filter((r) => r.status !== 'waiting' && r.status !== 'lobby');
  const prev = useRef<Record<string, number>>({});
  const moved: Record<string, boolean> = {};
  list.forEach((r, i) => { const p = prev.current[r.uid]; if (p !== undefined && i < p) moved[r.uid] = true; });
  useEffect(() => { const m: Record<string, number> = {}; list.forEach((r, i) => { m[r.uid] = i; }); prev.current = m; });
  return (
    <>
      <h1>Live race</h1>
      <p className="sub">{gid === 'all' ? 'All games' : gameById(gid)?.title}</p>
      {!list.length ? <div className="empty dark">No teams playing yet.</div> : (
        <ol className="race">
          {list.map((r, i) => {
            const node = D.teams[r.uid]?.prog?.node;
            return (
              <li key={r.uid} className={'rr ' + r.status + (moved[r.uid] ? ' up' : '')}>
                <span className="rk">{i + 1}</span>
                <span className="nm">{r.name}{gid === 'all' ? <small>{gameById(r.gid)?.title}</small> : null}</span>
                <span className="prog" aria-label={'Progress ' + r.T.steps + ' steps'}>
                  {MAIN_STEPS.map((s) => <i key={s} className={(r.T.nodes[s]?.solved ? 'd' : '') + (node === s && r.status === 'playing' ? ' h' : '')} title={graph(r.gid)[s].label} />)}
                </span>
                <span className="tm">{fmt(r.final)}</span>
                <span className={'stt ' + r.status}>{r.status === 'finished' || r.status === 'stopped' ? r.outcome.label : ST_LABEL[r.status] || r.status}</span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

/** Podium and table. On the big screen with all games, this is the event podium: the three winners. */
export function Board({ S, gid, now, big = false }: { S: Snap; gid: string; now: number; big?: boolean }) {
  const all = resultsOf(S, gid, now);
  const list = all.filter((r) => r.status === 'finished' || r.status === 'stopped');
  const winners = list.filter((r) => r.completed).slice(0, 3);
  const head = big ? <><h1><Trophy size={40} aria-hidden /> {gid === 'all' ? 'The winners' : 'Leaderboard'}</h1><p className="sub">{gid === 'all' ? 'Ranked by score: final time against each game’s par time' : gameById(gid)?.title}</p></> : null;
  if (!list.length) return <>{head}<div className={'empty' + (big ? ' dark' : '')}>No finished teams yet.</div></>;
  const order = [1, 0, 2];
  return (
    <>
      {head}
      <div className="podium">
        {order.map((i) => {
          const r: Result | undefined = winners[i];
          if (!r) return <div key={i} className="p" />;
          return (
            <div key={r.uid} className={'p p' + (i + 1)}>
              <div className="nm">{r.name}</div>
              <div className="tm">{fmt(r.final)} · {r.score}%{gid === 'all' ? <><br />{gameById(r.gid)?.title}</> : null}</div>
              <div className="blk">{i + 1}</div>
            </div>
          );
        })}
      </div>
      <div className="log-wrap">
        <table className="lbtable">
          <thead><tr><th>#</th><th>Team</th>{gid === 'all' ? <th>Game</th> : null}<th>Final time</th><th>Score</th><th>Outcome</th>{big ? null : <th>Wrong</th>}{big ? null : <th>Flags</th>}</tr></thead>
          <tbody>
            {list.slice(0, big ? 12 : 500).map((r, i) => (
              <tr key={r.uid}>
                <td className="rank">{r.completed ? i + 1 : '—'}</td><td>{r.name}</td>{gid === 'all' ? <td>{gameById(r.gid)?.title}</td> : null}
                <td className="mono">{r.completed ? fmt(r.final) : '—'}</td><td className="mono">{r.completed ? r.score + '%' : '—'}</td><td>{r.outcome.label}</td>
                {big ? null : <td className="mono">{r.T.wrong}</td>}
                {big ? null : <td className="small">{r.flags.length ? <span className="flag">{r.flags.join(' · ')}</span> : ''}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function BoardBig({ D, gid }: { D: Data; gid: string }) { const now = useNow(2000); return <Board S={D} gid={gid} now={now} big />; }

/* ---------- answer reveal: walk the room through each lock ---------- */
export function AnswerKey({ n }: { n: GameNode }): ReactNode {
  if (n.type === 'end') return null;
  if (n.type === 'decision') {
    return (
      <ul className="keylist">
        {n.options.map((o) => <li key={o.id} className={'q-' + o.q}><b>{o.q === 'best' ? 'Best' : o.q === 'ok' ? 'Acceptable' : 'Risky'}:</b> <Html html={o.text} /><span className="why">{o.note}</span></li>)}
      </ul>
    );
  }
  switch (n.type) {
    case 'spot': return <ul className="keylist">{n.items.filter((x) => x.flag).map((x) => <li key={x.id}><Html html={x.html} /><span className="why">{x.note}</span></li>)}</ul>;
    case 'code': return <p className="keycode">{codeDisplay(n)}</p>;
    case 'pick': return <ul className="keylist">{n.items.filter((x) => x.bad).map((x) => <li key={x.id}><Html html={x.text} />{x.why ? <span className="why">{x.why}</span> : null}</li>)}</ul>;
    case 'choice': return <ul className="keylist">{n.options.filter((o) => o.right).map((o) => <li key={o.id}><Html html={o.text} /></li>)}</ul>;
    case 'order': return <ol className="keylist">{n.steps.map((s) => <li key={s.id}><Html html={s.text} /></li>)}</ol>;
  }
}

function Reveal({ gid }: { gid: string }) {
  const gr = graph(gid), s = gameById(gid);
  const slides = REVEAL_ORDER;
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const n = gr[slides[i]];
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { setI((x) => Math.min(slides.length - 1, x + 1)); setShown(false); }
      if (e.key === 'ArrowLeft') { setI((x) => Math.max(0, x - 1)); setShown(false); }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setShown((v) => !v); }
    };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [slides.length]);
  const prompt = n.type === 'decision' ? n.prompt : isLockNode(n) ? n.task : '';
  return (
    <div className="reveal">
      <p className="sub">{s?.title} · answers · {i + 1} of {slides.length}</p>
      <h1>{n.label}</h1>
      <p className="rq"><Html html={prompt} /></p>
      {shown ? (
        <div className="ra">
          <AnswerKey n={n} />
          {isLockNode(n) ? <p className="rdeb"><Html html={n.debrief} /></p> : null}
        </div>
      ) : <div className="ra hidden-ans">Answer hidden</div>}
      <div className="rnav">
        <button type="button" className="pbtn" disabled={i === 0} onClick={() => { setI(i - 1); setShown(false); }} data-a="rprev"><ChevronLeft size={20} aria-hidden /> Previous</button>
        <button type="button" className="pbtn solid" onClick={() => setShown(!shown)} data-a="rshow"><Eye size={20} aria-hidden /> {shown ? 'Hide answer' : 'Reveal answer'}</button>
        <button type="button" className="pbtn" disabled={i === slides.length - 1} onClick={() => { setI(i + 1); setShown(false); }} data-a="rnext">Next <ChevronRight size={20} aria-hidden /></button>
      </div>
      <p className="hintkeys">Keyboard: ← → to move, Space to reveal</p>
    </div>
  );
}
