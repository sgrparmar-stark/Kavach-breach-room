'use client';
import { Award, Sparkles, Target, ListChecks } from 'lucide-react';
import { RATING_LABEL, TOPICS, type Report } from '@/lib/report';

/** The Kavach report: shown to the team at the end, and to the facilitator in History. */
export function ReportView({ rep, full = false }: { rep: Report; full?: boolean }) {
  return (
    <div className="report">
      {rep.badge ? (
        <div className="badge"><Award size={22} aria-hidden /><div><b>{rep.badge.name}</b><span>Your strongest area: {rep.badge.label}</span></div></div>
      ) : null}
      {rep.strengths.length ? (
        <section className="rsec good">
          <h3><Sparkles size={18} aria-hidden /> What you did well</h3>
          <ul>{rep.strengths.map((s) => <li key={s.id}><b>{s.title}</b><span>{s.good}</span></li>)}</ul>
        </section>
      ) : null}
      {rep.focus.length ? (
        <section className="rsec focus">
          <h3><Target size={18} aria-hidden /> Focus areas</h3>
          <ul>
            {rep.focus.map((s) => (
              <li key={s.id}>
                <b>{s.title}</b>
                {s.chose ? <span className="chose">You chose: {s.chose}</span> : null}
                <span>{s.why || s.gap}</span>
                {s.why && s.gap && s.why !== s.gap ? <span className="muted">{s.gap}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {rep.actions.length ? (
        <section className="rsec acts-sec">
          <h3><ListChecks size={18} aria-hidden /> Your action items</h3>
          <ol>{rep.actions.map((a) => <li key={a}>{a}</li>)}</ol>
        </section>
      ) : null}
      {full ? (
        <div className="log-wrap">
          <table className="ttable steps">
            <thead><tr><th>Step</th><th>Topic</th><th>Rating</th><th>Wrong</th><th>What happened</th></tr></thead>
            <tbody>
              {rep.steps.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.title}</b><div className="small">{s.kind === 'decision' ? 'Decision' : s.kind === 'detour' ? 'Detour' : s.kind === 'surprise' ? 'Surprise event' : 'Lock'}</div></td>
                  <td>{TOPICS[s.topic]?.label || s.topic}</td>
                  <td><span className={'rate ' + s.rating}>{RATING_LABEL[s.rating]}</span>{s.lifeline ? <div className="small">used help</div> : null}</td>
                  <td className="mono">{s.kind === 'lock' || s.kind === 'detour' ? s.wrong : '—'}</td>
                  <td className="small">{s.chose ? 'Chose: ' + s.chose : s.rating === 'strong' ? s.good : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
