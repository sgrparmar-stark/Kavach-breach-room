'use client';
import { useState } from 'react';
import { KeyRound, MonitorPlay } from 'lucide-react';
import { Shield } from '@/components/ui';
import { DemoStrip } from '@/components/DemoStrip';
import { getStore } from '@/lib/store';
import { go } from '@/lib/nav';
import { useMounted } from '@/lib/hooks';

/** Home page: teams type a room code here if they can't scan the QR code. */
export default function Landing() {
  const mounted = useMounted();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!mounted) return null;
  const demo = getStore().mode === 'demo';

  const join = () => {
    const c = code.replace(/\D/g, '');
    if (c.length !== 4) { setErr('Room codes have 4 digits.'); return; }
    setBusy(true); setErr('');
    const off = getStore().on('rooms/' + c, (gid) => {
      off(); setBusy(false);
      if (gid) go('/play?room=' + c); else setErr('No game uses that room code. Check it with your facilitator.');
    });
  };

  return (
    <>
      {demo ? <DemoStrip where="Start" /> : null}
      <main className="wrap">
        <div className="hero"><Shield className="hero" filled={4} /><div><span className="tag">Kavach Breach Room</span><h1>Join the breach room</h1></div></div>
        <p className="lede">Scan the QR code on your table, or type the 4-digit room code your facilitator shows on screen.</p>
        <form onSubmit={(ev) => { ev.preventDefault(); join(); }}>
          <label className="field" htmlFor="room">Room code</label>
          <input id="room" className="input codein" inputMode="numeric" maxLength={4} autoComplete="off" placeholder="0000" style={{ maxWidth: 200 }} value={code} onChange={(ev) => setCode(ev.target.value)} />
          <p className="fb bad" role="status">{err}</p>
          <div className="row" style={{ marginTop: 4 }}><button className="btn btn-primary" type="submit" disabled={busy} data-a="joinroom"><KeyRound size={18} aria-hidden /> Join</button></div>
        </form>
        <div className="card" style={{ marginTop: 32 }}>
          <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MonitorPlay size={20} aria-hidden /> Facilitator</h3>
          <p className="small" style={{ margin: '4px 0 10px' }}>Run the event from a laptop: open games, show the QR code and room code, launch teams and watch the live leaderboard.</p>
          <button className="btn btn-quiet btn-sm" type="button" onClick={() => go('/host')} data-a="gohost">Open the host dashboard</button>
        </div>
        {demo ? (
          <div className="note-box">
            <strong>Demo mode.</strong> No database is connected yet, so everything stays in this browser. To try it, open the host dashboard in one tab and join as a team in another
            {getStore().persistent ? '.' : '. This preview blocks browser storage, so open it in a normal browser window to test with several tabs.'}
          </div>
        ) : null}
        <p className="small" style={{ marginTop: 24 }}>Every company and person in this game is fictional.</p>
      </main>
    </>
  );
}
