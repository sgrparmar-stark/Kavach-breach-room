'use client';
import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import Console from './Console';
import { Shield } from '@/components/ui';
import { DemoStrip } from '@/components/DemoStrip';
import { getStore, setStoreRole, DEMO_PIN } from '@/lib/store';
import { useMounted } from '@/lib/hooks';

/** /host: facilitator sign-in, then the dashboard. */
export default function HostApp() {
  setStoreRole('host');
  const mounted = useMounted();
  const [state, setState] = useState<'checking' | 'login' | 'in'>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    const s = getStore();
    void s.init().then(() => s.restoreFac()).then((ok) => setState(ok ? 'in' : 'login'), () => setState('login'));
  }, [mounted]);
  if (!mounted || state === 'checking') return null;

  const s = getStore(), live = s.mode === 'live';
  if (state === 'in') return <Console onSignOut={() => { void s.signOut().then(() => { s.rememberFac(false); setState('login'); }); }} />;

  const submit = () => {
    setBusy(true); setErr('');
    void s.signInFac(live ? { email, password } : { pin }).then((ok) => {
      setBusy(false);
      if (ok) { s.rememberFac(true); setState('in'); } else setErr(s.lastError || 'Wrong PIN.');
    });
  };
  return (
    <>
      <DemoStrip where="Host sign-in" />
      <main className="wrap" style={{ maxWidth: 460 }}>
        <div className="hero"><Shield filled={4} className="hero" /><div><span className="tag">Facilitator only</span><h1 style={{ fontSize: 34 }}>Breach Room host</h1></div></div>
        <form onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
          {live ? (
            <>
              <label className="field" htmlFor="fe">Email</label>
              <input id="fe" className="input" type="email" autoComplete="username" value={email} onChange={(ev) => setEmail(ev.target.value)} />
              <label className="field" htmlFor="fp">Password</label>
              <input id="fp" className="input" type="password" autoComplete="current-password" value={password} onChange={(ev) => setPassword(ev.target.value)} />
            </>
          ) : (
            <>
              <p className="small">Demo mode: no database is connected. The demo PIN is {DEMO_PIN === '3010' ? '3010' : 'set in NEXT_PUBLIC_DEMO_PIN'}.</p>
              <label className="field" htmlFor="fpin">PIN</label>
              <input id="fpin" className="input" type="password" inputMode="numeric" style={{ maxWidth: 200 }} value={pin} onChange={(ev) => setPin(ev.target.value)} />
            </>
          )}
          <p className="fb bad" role="status">{err}</p>
          <div className="row"><button className="btn btn-primary" type="submit" disabled={busy} data-a="login"><LogIn size={18} aria-hidden /> {busy ? 'Signing in…' : 'Open dashboard'}</button></div>
        </form>
      </main>
    </>
  );
}
