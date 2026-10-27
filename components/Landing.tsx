'use client';
import { useEffect } from 'react';
import { MonitorPlay, Users } from 'lucide-react';
import { Shield } from '@/components/ui';
import { DemoStrip } from '@/components/DemoStrip';
import { getStore } from '@/lib/store';
import { go } from '@/lib/nav';
import { useMounted } from '@/lib/hooks';

/** Home page. Teams normally arrive by scanning the event QR code, which opens /play directly. */
export default function Landing() {
  const mounted = useMounted();
  useEffect(() => { document.body.classList.add('lq'); return () => document.body.classList.remove('lq'); }, []);
  if (!mounted) return null;
  const demo = getStore().mode === 'demo';
  return (
    <>
      {demo ? <DemoStrip where="Start" /> : null}
      <main className="wrap">
        <div className="hero"><Shield className="hero" filled={4} /><div><span className="tag">Kavach Breach Room</span><h1>Join the breach room</h1></div></div>
        <p className="lede">Scan the QR code on your table, or tap below, then register your team.</p>
        <button className="btn btn-primary" type="button" onClick={() => go('/play')} data-a="joinroom"><Users size={18} aria-hidden /> Join as a team</button>
        <div className="card" style={{ marginTop: 32 }}>
          <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MonitorPlay size={20} aria-hidden /> Facilitator</h3>
          <p className="small" style={{ margin: '4px 0 10px' }}>Run the event: open registration, start teams and show the live leaderboard.</p>
          <button className="btn btn-quiet btn-sm" type="button" onClick={() => go('/host')} data-a="gohost">Open the host dashboard</button>
        </div>
        {demo ? (
          <div className="note-box">
            <strong>Demo mode.</strong> No database is connected yet, so everything stays in this browser. Open the host dashboard in one tab and join as a team in another
            {getStore().persistent ? '.' : '. This preview blocks browser storage, so open it in a normal browser window to test with several tabs.'}
          </div>
        ) : null}
        <p className="small" style={{ marginTop: 24 }}>Every company and person in this game is fictional.</p>
      </main>
    </>
  );
}
