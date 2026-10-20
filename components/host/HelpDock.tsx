'use client';
import { useEffect, useRef } from 'react';
import { LifeBuoy } from 'lucide-react';
import { fmt } from '@/lib/game';
import { LIFELINE_S } from '@/lib/scoring';
import { play, unlockAudio } from '@/lib/sound';
import { Html } from '@/components/ui';
import { helpQueue, teamCmd, type Data, type HelpReq } from './data';

/** Ask Security team requests: an alert on every screen of the dashboard, with a sound and a count in the browser tab.
    On the big screen it stays small and hides the hint, so other teams can't read it. */
export default function HelpDock({ D, now, projecting, openTeam, say }: {
  D: Data; now: number; projecting: boolean; openTeam: (uid: string) => void; say: (m: string) => void;
}) {
  const list = helpQueue(D);
  const seen = useRef<Record<string, boolean>>({});

  // sound once for each new request; browsers only allow sound after a tap, so unlock on the first one
  useEffect(() => {
    const u = () => unlockAudio();
    document.addEventListener('pointerdown', u);
    return () => document.removeEventListener('pointerdown', u);
  }, []);
  const keys = list.map((r) => r.t.uid + ':' + r.at).join('|');
  useEffect(() => {
    let fresh = false;
    list.forEach((r) => { const k = r.t.uid + ':' + r.at; if (!seen.current[k]) { seen.current[k] = true; fresh = true; } });
    if (fresh) play('alert');
  }, [keys]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const base = 'Breach Room host';
    document.title = list.length ? '(' + list.length + ') Security help needed · ' + base : base;
    return () => { document.title = base; };
  }, [list.length]);

  if (!list.length) return null;
  const answer = (r: HelpReq, how: 'person' | 'phone' | 'no') => {
    teamCmd(D, r.t.uid, 'help', how);
    say(how === 'person' ? 'Security sent to ' + r.t.name + ' (+' + LIFELINE_S + 's)' : how === 'phone' ? 'Hint sent to ' + r.t.name + '’s phone (+' + LIFELINE_S + 's)' : r.t.name + ' told no one is free. Lifeline returned.');
  };
  return (
    <div className={'helpdock' + (projecting ? ' compact' : '')} role="region" aria-label="Security help requests" aria-live="assertive">
      {list.map((r) => {
        const k = r.t.uid + ':' + r.at, wait = Math.max(0, Math.round((now - r.at) / 1000));
        return (
          <div key={k} className="helpalert" data-u={r.t.uid}>
            <div className="ha-h">
              <LifeBuoy size={20} aria-hidden />
              <div className="ha-t">
                <b>{r.t.name} needs the Security team</b>
                <small>{r.gameTitle} · {r.label} · waiting {fmt(wait)}</small>
              </div>
            </div>
            {projecting ? (
              <div className="acts"><button className="b2 sm pri" type="button" onClick={() => openTeam(r.t.uid)} data-a="help-open">Respond</button></div>
            ) : (
              <>
                {r.hint ? (
                  <details className="ha-hint" open>
                    <summary>Hint for your security person</summary>
                    <p><Html html={r.hint} /></p>
                  </details>
                ) : null}
                <div className="acts">
                  <button className="b2 sm pri" type="button" onClick={() => answer(r, 'person')} data-a="help" data-v="person" data-u={r.t.uid}>Send someone (+{LIFELINE_S}s)</button>
                  <button className="b2 sm" type="button" onClick={() => answer(r, 'phone')} data-a="help" data-v="phone" data-u={r.t.uid}>Hint to their phone (+{LIFELINE_S}s)</button>
                  <button className="b2 sm" type="button" onClick={() => answer(r, 'no')} data-a="help" data-v="no" data-u={r.t.uid}>No one free</button>
                  <button className="linkish" type="button" onClick={() => openTeam(r.t.uid)} data-a="help-open">Open team</button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
