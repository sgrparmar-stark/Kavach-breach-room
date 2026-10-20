'use client';
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { SCENARIOS } from '@/data/scenarios';
import { fmt, gameById } from '@/lib/game';
import { evList } from '@/lib/scoring';
import { TOPICS, TOPIC_ORDER } from '@/lib/report';
import { useDb } from '@/lib/hooks';
import type { Json } from '@/lib/store';
import { ReportView } from '@/components/Report';
import { Board } from './Projector';
import {
  teamList, resultsOf, reportOf, questionStats, describeEvent, resultsCsv, actionsCsv, answersCsv, logCsv, downloadText, ctlOf,
  type Data, type Snap, type SessionMeta,
} from './data';

type View = 'results' | 'reports' | 'questions' | 'heatmap';

/** Every session, current and archived: results, each team’s report and answer sheet, question analysis and an awareness heatmap. */
export default function History({ D, now, say }: { D: Data; now: number; say: (m: string) => void }) {
  const [sid, setSid] = useState('current');
  const [view, setView] = useState<View>('results');
  const [teamUid, setTeamUid] = useState<string | null>(null);
  const [qGame, setQGame] = useState('');
  const arch = useDb<Json>(sid !== 'current' ? 'sessions/' + sid : null);
  const sessions = Object.keys(D.sessionsIdx || {}).map((k) => ({ id: k, ...(D.sessionsIdx[k] as SessionMeta) })).sort((a, b) => b.at - a.at);
  const S: Snap | null = sid === 'current' ? D : arch ? { teams: arch.teams || {}, assign: arch.assign || {}, runs: arch.runs || {}, control: arch.control || {}, games: arch.games || {}, members: arch.members || {}, insiders: arch.insiders || {}, log: arch.log || {} } : null;
  const tNow = sid === 'current' ? now : Number(arch?.meta?.at) || now;
  const label = sid === 'current' ? 'Current session' : (arch?.meta?.name || 'Archived session');
  const file = (s: string) => (sid === 'current' ? 'current' : String(arch?.meta?.name || sid).replace(/[^a-z0-9]+/gi, '-').toLowerCase()) + '-' + s;

  return (
    <>
      <div className="sesslist" role="tablist" aria-label="Sessions">
        <button type="button" role="tab" aria-selected={sid === 'current'} onClick={() => { setSid('current'); setTeamUid(null); }} data-a="sess" data-v="current">
          <b>Current session</b><small>{teamList(D).length} teams · live</small>
        </button>
        {sessions.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={sid === s.id} onClick={() => { setSid(s.id); setTeamUid(null); }} data-a="sess" data-v={s.id}>
            <b>{s.name}</b><small>{new Date(s.at).toLocaleDateString()} · {s.teams} teams{s.podium?.[0] ? ' · 1st ' + s.podium[0].name : ''}</small>
          </button>
        ))}
      </div>
      {!S ? <div className="empty">Loading the session…</div> : (
        <>
          <div className="toolbar">
            <h2 className="hh">{label}</h2>
            <span className="sp" />
            <button className="b2 sm" type="button" onClick={() => downloadText(file('results.csv'), resultsCsv(S, tNow))} data-a="dl-results"><Download size={14} aria-hidden /> Results</button>
            <button className="b2 sm" type="button" onClick={() => downloadText(file('action-items.csv'), actionsCsv(S, tNow))} data-a="dl-actions"><Download size={14} aria-hidden /> Action items</button>
            <button className="b2 sm" type="button" onClick={() => downloadText(file('answers.csv'), answersCsv(S))} data-a="dl-answers"><Download size={14} aria-hidden /> Answers</button>
            <button className="b2 sm" type="button" onClick={() => downloadText(file('log.csv'), logCsv(S))}><Download size={14} aria-hidden /> Log</button>
            <button className="b2 sm" type="button" onClick={() => { if (downloadText(file('record.json'), JSON.stringify(sid === 'current' ? S : arch, null, 1), 'application/json')) say('Full record downloaded'); }}><Download size={14} aria-hidden /> Full record</button>
          </div>
          <div className="ctabs sub" role="tablist">
            {([['results', 'Results'], ['reports', 'Team reports'], ['questions', 'Questions'], ['heatmap', 'Heatmap']] as [View, string][]).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} data-a="hview" data-v={k}>{l}</button>
            ))}
          </div>
          {view === 'results' ? <Board S={S} gid="all" now={tNow} />
            : view === 'reports' ? <Reports S={S} now={tNow} uid={teamUid} setUid={setTeamUid} />
            : view === 'questions' ? <Questions S={S} now={tNow} gid={qGame} setGid={setQGame} />
            : <Heatmap S={S} now={tNow} />}
        </>
      )}
    </>
  );
}

function Reports({ S, now, uid, setUid }: { S: Snap; now: number; uid: string | null; setUid: (u: string | null) => void }) {
  const res = resultsOf(S, 'all', now).filter((r) => r.T.startAt);
  if (!res.length) return <div className="empty">No team has played yet in this session.</div>;
  const r = res.find((x) => x.uid === uid) || res[0];
  const rep = reportOf(r);
  const evs = evList(S.runs?.[r.uid]?.ev), start = evs.find((e) => e.k === 'go')?.t || 0;
  const adjs = ctlOf(S, r.uid).adjs;
  return (
    <div className="rgrid">
      <div className="rlist" role="listbox" aria-label="Teams">
        {res.map((x) => (
          <button key={x.uid} type="button" aria-selected={x.uid === r.uid} onClick={() => setUid(x.uid)} data-a="rteam" data-v={x.uid}>
            <b>{x.name}</b><small>{gameById(x.gid)?.title} · {x.completed ? fmt(x.final) : x.outcome.label || 'Playing'}</small>
          </button>
        ))}
      </div>
      <div>
        <div className="card">
          <h3 style={{ marginBottom: 2 }}>{r.name}</h3>
          <p className="small" style={{ margin: 0 }}>{gameById(r.gid)?.title} · {r.expert ? 'Expert' : 'Standard'} · {r.outcome.label || 'In progress'}{r.completed ? ' · final ' + fmt(r.final) + ' · score ' + r.score + '%' : ''}</p>
          <p className="small" style={{ margin: '4px 0 0' }}>Clock {fmt(r.clock)} · penalties {r.pen}s ({r.T.wrong} wrong, {r.T.lifelines} lifelines, {r.T.hints} hints{r.T.decQ ? ', decision ' + r.T.decQ : ''}){r.adj ? ' · adjustments ' + (r.adj > 0 ? '+' : '') + r.adj + 's' : ''}</p>
          {adjs ? <p className="small" style={{ margin: '4px 0 0' }}>Adjustments: {Object.values(adjs as Record<string, Json>).map((a: Json) => (a.d > 0 ? '+' : '') + a.d + 's (' + a.why + ')').join(', ')}</p> : null}
          {r.flags.length ? <p className="small flag" style={{ margin: '6px 0 0' }}>Check: {r.flags.join(' · ')}</p> : null}
        </div>
        <ReportView rep={rep} full />
        <h3 className="hh" style={{ marginTop: 18 }}>Answer sheet</h3>
        <div className="log-wrap">
          <table className="ttable sheet">
            <thead><tr><th>Time</th><th>Step</th><th>What happened</th></tr></thead>
            <tbody>
              {evs.map((e, i) => { const d = describeEvent(r.gid, e); return d ? <tr key={i} className={'t-' + d.tone}><td className="mono">{fmt((e.t - start) / 1000)}</td><td>{d.step}</td><td>{d.what}</td></tr> : null; })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Questions({ S, now, gid, setGid }: { S: Snap; now: number; gid: string; setGid: (g: string) => void }) {
  const played = SCENARIOS.filter((s) => teamList(S).some((t) => t.game === s.id && S.runs?.[t.uid]?.ev));
  const g = gid && played.some((s) => s.id === gid) ? gid : played[0]?.id || '';
  const stats = useMemo(() => (g ? questionStats(S, g, now) : []), [S, g, now]);
  if (!played.length) return <div className="empty">No answers recorded yet in this session.</div>;
  return (
    <>
      <div className="toolbar">
        <select className="sel" value={g} onChange={(ev) => setGid(ev.target.value)} aria-label="Game">
          {played.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <span className="small">Where teams struggled: first-try rate, average wrong answers and the most common wrong answer.</span>
      </div>
      <div className="log-wrap">
        <table className="ttable">
          <thead><tr><th>Step</th><th>Teams</th><th>First try</th><th>Avg wrong</th><th>Most common wrong answer / choices</th></tr></thead>
          <tbody>
            {stats.map((q) => (
              <tr key={q.node}>
                <td><b>{q.title}</b></td>
                <td className="mono">{q.reached}</td>
                <td>{q.reached ? <span className={'rate ' + (q.firstTry / q.reached >= 0.7 ? 'strong' : q.firstTry / q.reached >= 0.4 ? 'good' : 'focus')}>{Math.round((q.firstTry / q.reached) * 100)}%</span> : '—'}</td>
                <td className="mono">{q.split ? '—' : q.avgWrong}</td>
                <td className="small">{q.split ? q.split.map((x) => (x.q === 'best' ? 'Best' : x.q === 'ok' ? 'Acceptable' : 'Risky') + ': ' + x.n).join(' · ') : q.common || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Heatmap({ S, now }: { S: Snap; now: number }) {
  const rows = resultsOf(S, 'all', now).filter((r) => r.T.startAt).map((r) => ({ r, rep: reportOf(r) }));
  const topics = TOPIC_ORDER.filter((tp) => rows.some((x) => x.rep.topics[tp] != null));
  if (!rows.length) return <div className="empty">No answers recorded yet in this session.</div>;
  const cls = (v: number | undefined) => (v == null ? '' : v >= 2.5 ? 'h3' : v >= 1.75 ? 'h2' : 'h1');
  const avg = (tp: string) => { const v = rows.map((x) => x.rep.topics[tp as keyof typeof x.rep.topics]).filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined; };
  return (
    <>
      <p className="small">Green: strong (mostly first-try). Amber: some slips. Red: a focus area for follow-up training.</p>
      <div className="log-wrap">
        <table className="ttable heat">
          <thead><tr><th>Team</th>{topics.map((tp) => <th key={tp}>{TOPICS[tp].label}</th>)}</tr></thead>
          <tbody>
            {rows.map(({ r, rep }) => (
              <tr key={r.uid}><td><b>{r.name}</b><div className="small">{gameById(r.gid)?.title}</div></td>{topics.map((tp) => <td key={tp} className={'hc ' + cls(rep.topics[tp])}>{rep.topics[tp] != null ? '' : '·'}</td>)}</tr>
            ))}
            <tr className="avg"><td><b>Everyone</b></td>{topics.map((tp) => <td key={tp} className={'hc ' + cls(avg(tp))} />)}</tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
