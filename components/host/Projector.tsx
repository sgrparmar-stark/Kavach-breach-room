'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Flame, Headphones, Scissors, Trophy } from 'lucide-react';
import { gameById, graph, fmt, codeDisplay, isLockNode, type NodeId, type GameNode } from '@/lib/game';
import { QRBox, Html } from '@/components/ui';
import { playUrl } from '@/lib/nav';
import { useNow } from '@/lib/hooks';
import { getStore } from '@/lib/store';
import { G, teamsOf, ranked, raceOrder, prog, tStatus, liveTime, finalOf, GS_LABEL, ST_LABEL, type Data, type Team } from './data';

export type ProjKind = 'lobby' | 'race' | 'board' | 'reveal';

/** Full-screen views for the projector or a second screen. */
export default function Projector({ D, kind, gid, base, onClose }: { D: Data; kind: ProjKind; gid: string; base: string; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="projx" role="dialog" aria-label="Projector view">
      <button type="button" className="close" onClick={onClose} data-a="unproj"><ArrowLeft size={16} aria-hidden /> Back (Esc)</button>
      {kind === 'lobby' ? <Lobby D={D} gid={gid} base={base} /> : kind === 'race' ? <Race D={D} gid={gid} /> : kind === 'board' ? <Board D={D} gid={gid} big /> : <Reveal gid={gid} />}
    </div>
  );
}

function Lobby({ D, gid, base }: { D: Data; gid: string; base: string }) {
  const s = gameById(gid), g = G(D, gid), list = teamsOf(D, gid);
  const seen = useRef<Record<string, boolean>>({});
  const demo = getStore().mode === 'demo';
  const url = g.room && base && !demo ? playUrl({ room: g.room }) : '';
  return (
    <>
      <h1>{s?.title}</h1>
      <p className="sub">Kavach Breach Room · {g.state === 'open' ? 'Scan or type the room code to register your team' : g.state === 'closed' || !g.state ? 'Registration opens soon' : GS_LABEL[g.state]}</p>
      <div className="lobby">
        {url ? <QRBox value={url} size={420} label={'QR code for ' + s?.title} /> : <div className="qrbox" style={{ padding: 40, lineHeight: 1.4, color: '#000', maxWidth: 420 }}>{demo ? 'Demo mode: teams join with the room code in another tab. Once hosted, the QR code shows here.' : 'Host the game to show its QR code here.'}</div>}
        <div className="joined">
          <div className="roomcode"><span>Room code</span><b>{g.room || '····'}</b><small>{(base || '').replace(/^https?:\/\//, '')}</small></div>
          <h2>Teams joined: {list.length}</h2>
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
  const list = raceOrder(D, gid, now);
  const prev = useRef<Record<string, number>>({});
  const moved: Record<string, boolean> = {};
  list.forEach((t, i) => { const p = prev.current[t.uid]; if (p !== undefined && i < p) moved[t.uid] = true; });
  useEffect(() => { const m: Record<string, number> = {}; list.forEach((t, i) => { m[t.uid] = i; }); prev.current = m; });
  const steps: NodeId[] = ['L1', 'L2', 'D', 'L3', 'L4'];
  return (
    <>
      <h1>Live race</h1>
      <p className="sub">{gid === 'all' ? 'All games' : gameById(gid)?.title}</p>
      {!list.length ? <div className="empty dark">No teams yet.</div> : (
        <ol className="race">
          {list.map((t, i) => {
            const p = prog(t), st = tStatus(D, t), path: string[] = p.path || [];
            return (
              <li key={t.uid} className={'rr ' + st + (moved[t.uid] ? ' up' : '')}>
                <span className="rk">{i + 1}</span>
                <span className="nm">{t.name}{gid === 'all' ? <small>{gameById(t.game)?.title}</small> : null}</span>
                <span className="prog" aria-label={'Progress ' + (p.solved || 0) + ' steps'}>
                  {steps.map((sId) => {
                    const done = path.includes(sId) && (p.node !== sId || st === 'finished' || (p.solved || 0) > path.indexOf(sId));
                    const here = p.node === sId && st !== 'finished' && st !== 'stopped';
                    return <i key={sId} className={(done ? 'd' : '') + (here ? ' h' : '')} title={graph(t.game)[sId].label} />;
                  })}
                  {path.includes('X') ? <em title="Took the detour">detour</em> : null}
                </span>
                <span className="icons">
                  {p.streak >= 2 ? <span className="fl"><Flame size={18} aria-hidden />{p.streak}</span> : null}
                  <Headphones size={18} aria-label={p.askIt ? 'Ask IT used' : 'Ask IT available'} className={p.askIt ? 'used' : ''} />
                  <Scissors size={18} aria-label={p.fifty ? '50:50 used' : '50:50 available'} className={p.fifty ? 'used' : ''} />
                </span>
                <span className="tm">{st === 'waiting' || st === 'new' ? '—' : st === 'stopped' ? 'stopped' : fmt(liveTime(D, t, now))}</span>
                <span className={'stt ' + st}>{st === 'finished' ? (p.outcome || 'Finished') : ST_LABEL[st] || st}</span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

export function Board({ D, gid, big = false }: { D: Data; gid: string; big?: boolean }) {
  const list = ranked(D, gid);
  const head = big ? <><h1><Trophy size={40} aria-hidden /> Leaderboard</h1><p className="sub">{gid === 'all' ? 'All games' : gameById(gid)?.title}</p></> : null;
  if (!list.length) return <>{head}<div className={'empty' + (big ? ' dark' : '')}>No finished teams yet.</div></>;
  const top = list.slice(0, 3), order = [1, 0, 2];
  return (
    <>
      {head}
      <div className="podium">
        {order.map((i) => {
          const t: Team | undefined = top[i];
          if (!t) return <div key={i} className="p" />;
          const p = prog(t);
          return (
            <div key={t.uid} className={'p p' + (i + 1)}>
              <div className="nm">{t.name}</div>
              <div className="tm">{p.outcomeKey === 'stopped' ? 'Not finished' : fmt(finalOf(D, t))}{gid === 'all' ? ' · ' + gameById(t.game)?.title : ''}</div>
              <div className="blk">{i + 1}</div>
            </div>
          );
        })}
      </div>
      <div className="log-wrap">
        <table className="lbtable">
          <thead><tr><th>#</th><th>Team</th>{gid === 'all' ? <th>Game</th> : null}<th>Time</th><th>Outcome</th>{big ? null : <th>Wrong</th>}{big ? null : <th>Best streak</th>}</tr></thead>
          <tbody>
            {list.slice(0, big ? 12 : 200).map((t, i) => {
              const p = prog(t);
              return (
                <tr key={t.uid}>
                  <td className="rank">{i + 1}</td><td>{t.name}</td>{gid === 'all' ? <td>{gameById(t.game)?.title}</td> : null}
                  <td className="mono">{p.outcomeKey === 'stopped' ? '—' : fmt(finalOf(D, t))}</td><td>{p.outcome}</td>
                  {big ? null : <td className="mono">{p.wrong || 0}</td>}{big ? null : <td className="mono">{p.bestStreak || 0}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

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
  const slides: NodeId[] = ['L1', 'L2', 'D', 'X', 'L3', 'L4'];
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
      <p className="sub">{s?.title} · answer reveal · {i + 1} of {slides.length}</p>
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
