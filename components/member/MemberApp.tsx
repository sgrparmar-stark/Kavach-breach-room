'use client';
import { useEffect, useState } from 'react';
import { getStore, log, type Json } from '@/lib/store';
import { gameById } from '@/lib/game';
import { Shield } from '@/components/ui';
import { DemoStrip } from '@/components/DemoStrip';

/* Insider round: what each teammate sees on their own phone. */
const SEATS = ['Tiger', 'Falcon', 'Cobra', 'Panther', 'Wolf', 'Shark', 'Eagle', 'Rhino'];
const MISSION = [
  'At the decision point, argue for the risky option. Sound convincing.',
  'If a surprise event arrives, push your team towards the risky answer.',
  'Talk your team into at least one wrong answer, or a lifeline they don’t need.',
  'Don’t get caught. At the end, your team votes on who the Insider was.',
];

export default function MemberApp({ team }: { team: string }) {
  const [uid, setUid] = useState<string | null>(null);
  const [M, setM] = useState<Json>({});
  const [role, setRole] = useState<Json>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const store = getStore();
    const offs: (() => void)[] = [];
    let alive = true;
    void store.init().then(() => store.signInTeam()).then((u) => {
      if (!alive) return;
      setUid(u);
      offs.push(store.on('members/' + team, (v) => setM(v || {})));
      offs.push(store.on('roles/' + u, (v) => setRole(v)));
    }).catch((e: Error) => setErr(e?.message || 'Could not connect.'));
    return () => { alive = false; offs.forEach((o) => o()); };
  }, [team]);

  const mine: string | undefined = uid && M[uid] ? M[uid].seat : undefined;
  const taken: Record<string, string> = {};
  Object.keys(M).forEach((k) => { if (k !== 'meta' && M[k] && M[k].seat) taken[M[k].seat] = k; });
  const meta = M.meta || {};
  const gid: string = meta.game || '';
  const s = gameById(gid);

  const pick = (n: string) => {
    if (mine || busy || !uid) return;
    if (taken[n]) { setErr('Someone just took that seat.'); return; }
    setBusy(true);
    const store = getStore();
    store.set('members/' + team + '/' + uid, { seat: n, at: store.now() }).then(() => {
      setBusy(false); setErr(''); void log('member_join', 'Seat ' + n + ' joined', { uid, team: meta.name || '', game: gid });
    }, () => { setBusy(false); setErr('Couldn’t join. Check your connection.'); });
  };

  let body;
  if (!uid) body = <p className="muted">Connecting…</p>;
  else if (!mine) {
    body = (
      <>
        <p className="lede">Pick a seat. It’s your code name for this round, so no real names.</p>
        <div className="seatgrid">
          {SEATS.map((n) => <button key={n} type="button" className="btn btn-quiet" disabled={!!taken[n] || busy} onClick={() => pick(n)} data-a="seat" data-v={n}>{n}{taken[n] ? ' · taken' : ''}</button>)}
        </div>
        <p className="fb bad">{err}</p>
      </>
    );
  } else if (!role) {
    body = (
      <>
        <div className="status open"><span className="dot" />You are&nbsp;<strong>{mine}</strong></div>
        <p style={{ marginTop: 16 }}>Wait for your facilitator to deal the secret roles. Keep this screen to yourself.</p>
      </>
    );
  } else {
    const ins = role.role === 'insider';
    const rv = role.revealed;
    body = (
      <>
        <p className="small">You are <strong>{mine}</strong> · {s ? s.title : ''}</p>
        {!shown ? (
          <button type="button" className="rolecard hidden" onClick={() => setShown(true)} data-a="show"><span>Tap to see your secret role</span><small>Make sure nobody is looking</small></button>
        ) : (
          <button type="button" className={'rolecard ' + (ins ? 'insider' : 'loyal')} onClick={() => setShown(false)} data-a="hide">
            {ins ? (
              <><b>You are the INSIDER</b><span>Your mission, without getting caught:</span><ol>{MISSION.map((m) => <li key={m}>{m}</li>)}</ol></>
            ) : (
              <><b>You are LOYAL</b><span>Someone on your team may be the Insider, quietly steering you into risky choices. Watch who argues for the dangerous option. At the end, your team votes.</span></>
            )}
            <small>Tap to hide</small>
          </button>
        )}
        {rv ? (
          <div className={'conseq ' + (rv.correct ? (ins ? 'poor' : 'best') : (ins ? 'best' : 'poor'))} style={{ marginTop: 16 }}>
            <h3>{ins ? (rv.correct ? 'You were caught!' : 'You got away with it!') : (rv.correct ? 'Your team caught the Insider!' : 'The Insider fooled your team')}</h3>
            <p style={{ margin: 0 }}>The Insider was <strong>{rv.seat}</strong>.</p>
          </div>
        ) : null}
      </>
    );
  }
  return (
    <>
      <DemoStrip where="Teammate view" />
      <main className="wrap">
        <div className="hero"><Shield className="hero" /><div><span className="tag x">Insider round</span><h1 style={{ fontSize: 30 }}>{meta.name || 'Your team'}</h1></div></div>
        {body}
      </main>
    </>
  );
}
