'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Headphones, Scissors, Snowflake, ShieldAlert, ShieldCheck } from 'lucide-react';
import { TeamEngine } from './engine';
import { LockBody, DecisionBody } from './Locks';
import { Shield, Html, MuteButton, QRBox, Check } from '@/components/ui';
import { MODES, ASK_IT_MS, LOCK_COUNT, MAIN_STEPS, fmt, injectById, isLockNode, lockNumber, fiftyLabel, makeVerifyCode, gameIndex, stepsDone } from '@/lib/game';
import { playUrl } from '@/lib/nav';
import { getStore } from '@/lib/store';
import { DemoStrip } from '@/components/DemoStrip';

export default function TeamApp({ gid }: { gid: string }) {
  const ref = useRef<TeamEngine | null>(null);
  if (!ref.current) ref.current = new TeamEngine(gid);
  const e = ref.current;
  useSyncExternalStore(e.subscribe, e.getVersion, e.getVersion);
  useEffect(() => { void e.start(); return () => e.stop(); }, [e]);

  if (e.connectError) {
    return <main className="wrap"><h1>Can’t connect</h1><p>{e.connectError}</p><p>Check your internet connection and scan the QR code again.</p></main>;
  }
  const P = e.P;
  if (!e.loaded.game || !e.loaded.ctl) return <><DemoStrip where="Team view" /><main className="wrap"><p className="muted">Connecting…</p></main></>;

  return (
    <>
      <DemoStrip where="Team view" />
      <Banner e={e} />
      {P.started ? <Bar e={e} /> : null}
      <main className="wrap">
        {!P.started ? <Lobby e={e} /> : P.finished ? <Done e={e} /> : P.pendingInject && injectById(P.pendingInject) ? <InjectCard e={e} /> : <Play e={e} />}
      </main>
      <FlashOverlay e={e} />
      {P.started && !P.finished && e.paused() ? (
        <div className="overlay" role="alertdialog" aria-label="Game paused">
          <div><Shield className="big" /><h2>Paused</h2><p>Your facilitator has paused the game. The clock is stopped.</p></div>
        </div>
      ) : null}
    </>
  );
}

/* ---------- header: where you are, the clock, sound, and a progress track ---------- */
function Bar({ e }: { e: TeamEngine }) {
  const P = e.P, n = e.node();
  const step = P.finished ? 'Case closed' : n ? (n.type === 'decision' || n.id === 'X' ? lockNumber(n) : lockNumber(n) + ' of ' + LOCK_COUNT) : '';
  const s = e.score(), freeze = e.freezeLeft();
  const done = stepsDone(P.path, P.node || '', P.nodeDone, P.finished);
  const [popKey, setPopKey] = useState(0);
  const lastPop = useRef(0);
  useEffect(() => { if (e.pop && e.pop.at !== lastPop.current) { lastPop.current = e.pop.at; setPopKey((k) => k + 1); } });
  return (
    <header className="bar">
      <div className="bar-in">
        <div className="bar-mid">
          <div className="bar-step">{step}</div>
          <div className="bar-team">{P.name}</div>
        </div>
        <div className={'timer' + (s > e.M().target ? ' over' : '') + (freeze ? ' frozen' : '')} id="timer">
          {e.pop && popKey ? <span key={popKey} className="pop show" aria-hidden="true">{e.pop.text}</span> : null}
          <span className="t" id="t">{fmt(s)}</span>
          {freeze ? <small><Snowflake size={12} aria-hidden /> frozen {Math.ceil(freeze / 1000)}s</small> : null}
        </div>
        <MuteButton />
      </div>
      <div className="track" aria-label={'Progress: ' + done + ' of ' + MAIN_STEPS.length + ' steps'}>
        {MAIN_STEPS.map((id, i) => <i key={id} className={(i < done ? 'd' : '') + (id === P.node && !P.finished ? ' h' : '') + (id === 'D' ? ' dec' : '')} />)}
      </div>
    </header>
  );
}

function Banner({ e }: { e: TeamEngine }) {
  const m = e.P.msg;
  if (!m || m.seen) return null;
  return (
    <div className="banner" role="status">
      <div className="bt"><b>FROM YOUR FACILITATOR</b>{m.text}</div>
      <button type="button" onClick={() => e.act('msgok')}>OK</button>
    </div>
  );
}

function FlashOverlay({ e }: { e: TeamEngine }) {
  const [show, setShow] = useState<null | { kind: string; text: string; key: number }>(null);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const f = e.flash;
    if (f && f.at !== last.current) {
      last.current = f.at;
      setShow({ kind: f.kind, text: f.text, key: f.at });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(null), f.kind === 'breach' ? 1100 : 950);
    }
  });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!show) return null;
  return (
    <div key={show.key} className={'flash ' + show.kind} aria-live="assertive">
      <div className="flash-in">
        {show.kind === 'breach' ? <ShieldAlert size={44} aria-hidden /> : show.kind === 'granted' ? <ShieldCheck size={44} aria-hidden /> : <Headphones size={40} aria-hidden />}
        <b>{show.kind === 'breach' ? 'BREACH' : show.kind === 'granted' ? 'UNLOCKED' : 'LIFELINE'}</b>
        {show.text ? <span>{show.text}</span> : null}
      </div>
    </div>
  );
}

/* ---------- registration and waiting ---------- */
function Lobby({ e }: { e: TeamEngine }) {
  const P = e.P, m = MODES[e.game.mode === 'x' ? 'x' : 'std'], st = e.game.state;
  const [name, setName] = useState(P.name);
  const [code, setCode] = useState('');
  const head = (
    <>
      <div className="hero"><Shield className="hero" /><div><span className="tag">Kavach Breach Room</span><h1>{e.S.title}</h1></div></div>
      <p className="lede">{e.S.lede}</p>
    </>
  );
  if (!P.registered) {
    const open = st === 'open';
    return (
      <section>
        {head}
        <ul className="rules">
          <li>{LOCK_COUNT} locks and one big decision. Fastest team wins.</li>
          <li>Each wrong answer adds {m.pen} seconds.</li>
          <li>One <strong>Ask IT</strong> (a hint, clock frozen for 45 seconds) and one <strong>50:50</strong> per game.</li>
        </ul>
        {open ? (
          <form onSubmit={(ev) => { ev.preventDefault(); e.register(name); }}>
            <label className="field" htmlFor="team">Team name</label>
            <input id="team" className="input" maxLength={30} autoComplete="off" placeholder="e.g. Floor 4 Firewalls" value={name} onChange={(ev) => setName(ev.target.value)} />
            <p className={'fb ' + e.fb.type} role="status">{e.fb.msg}</p>
            <button className="btn btn-primary" type="submit" disabled={e.busy} data-a="register">Register our team</button>
          </form>
        ) : (
          <>
            <div className="status"><span className="dot" />{st === 'ended' ? 'This game has ended.' : 'Registration opens when your facilitator is ready. This screen updates by itself.'}</div>
            <p className={'fb ' + e.fb.type} role="status">{e.fb.msg}</p>
          </>
        )}
        <p className="small" style={{ marginTop: 22 }}>Every company and person in this game is fictional.</p>
      </section>
    );
  }
  const seats = e.seats();
  return (
    <section>
      {head}
      <div className="status open"><span className="dot" />Registered as&nbsp;<strong>{P.name}</strong></div>
      {e.insiderOn() ? (
        <div className="card insider-box">
          <span className="tag x">Insider round</span>
          <h3 style={{ margin: '6px 0 4px' }}>Everyone on your team: scan this with your own phone</h3>
          <p className="small" style={{ margin: 0 }}>Each person picks a seat and gets a secret role. One of you may be working against the team.</p>
          {getStore().mode === 'live' ? <QRBox value={playUrl({ game: e.gid, join: e.uid || '' })} size={200} label="Teammate QR code" className="inline-qr" />
            : <p className="small">Demo: open another tab, choose <strong>Teammate</strong>, and pick this team.</p>}
          <p style={{ margin: '8px 0 0' }}><strong>{seats.length}</strong> joined{seats.length ? ': ' + seats.map((x) => x.seat).join(', ') : ''}</p>
        </div>
      ) : null}
      <form onSubmit={(ev) => { ev.preventDefault(); e.tryCode(code); }} style={{ marginTop: 18 }}>
        <label className="field" htmlFor="lc">Launch code from your facilitator</label>
        <div className="row">
          <input id="lc" className="input codein" inputMode="numeric" maxLength={4} autoComplete="off" placeholder="0000" style={{ maxWidth: 160 }} value={code} onChange={(ev) => setCode(ev.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={e.busy} data-a="code">Start</button>
        </div>
        <p className={'fb ' + e.fb.type} role="status">{e.fb.msg}</p>
      </form>
      <p className="small">Keep this screen open. It also starts by itself if your facilitator launches you.</p>
    </section>
  );
}

/* ---------- lifelines ---------- */
function Lifelines({ e }: { e: TeamEngine }) {
  const P = e.P, n = e.node();
  if (!n || !isLockNode(n) || P.nodeDone) return null;
  const askUsed = !!P.askIt, fiftyUsed = !!P.fiftyUsed;
  return (
    <div className="lifelines" role="group" aria-label="Lifelines">
      <button type="button" className={'ll' + (askUsed ? ' used' : '')} disabled={!e.canAskIt()} onClick={() => e.askIt()} data-a="askit" aria-label={askUsed ? 'Ask IT, used' : 'Ask IT: a hint and 45 seconds off the clock'}>
        <Headphones size={18} aria-hidden /> Ask IT
      </button>
      <button type="button" className={'ll' + (fiftyUsed ? ' used' : '')} disabled={!e.canFifty()} onClick={() => e.fifty()} data-a="fifty" aria-label={fiftyUsed ? '50:50, used' : '50:50: ' + fiftyLabel(n)}>
        <Scissors size={18} aria-hidden /> 50:50
      </button>
    </div>
  );
}

function SocMessage({ hint, at }: { hint: string; at: number }) {
  const left = Math.max(0, ASK_IT_MS - (getStore().now() - at));
  return (
    <div className="soc" role="note" aria-label="Hint from the Security Operations Centre">
      <div className="soc-av" aria-hidden="true">SOC</div>
      <div className="soc-body">
        <p><Html html={hint} /></p>
        <p className="soc-foot">{left > 0 ? <><Snowflake size={13} aria-hidden /> Clock frozen · {Math.ceil(left / 1000)}s</> : 'Clock running again'}</p>
      </div>
    </div>
  );
}

/* ---------- playing ---------- */
function Play({ e }: { e: TeamEngine }) {
  const P = e.P, L = e.node();
  const [confirmLeave, setConfirmLeave] = useState(false);
  if (!L || L.type === 'end') return null;
  let body: ReactNode, deb: ReactNode = null;
  if (L.type === 'decision') {
    body = <div className="decision-card"><DecisionBody prompt={L.prompt} options={L.options} picked={P.cur.choice} onPick={(id) => e.act('dec', id)} action="decide" /></div>;
    if (P.cur.choice) deb = <div className="row"><button className="btn btn-primary" type="button" onClick={() => e.act('next')} data-a="next">Continue</button></div>;
  } else {
    const hk = P.hintNodes[L.id];
    body = (
      <>
        <LockBody L={L} e={e} done={P.nodeDone} />
        <p className={'fb ' + e.fb.type} role="status" aria-live="polite">{e.fb.msg}</p>
        {hk === 'soc' && P.askIt ? <SocMessage hint={L.hint} at={P.askIt.at} /> : hk === 'free' ? <div className="hint"><strong>Hint:</strong> <Html html={L.hint} /></div> : null}
        <Lifelines e={e} />
      </>
    );
    if (P.nodeDone) {
      deb = (
        <div className="debrief" id="debrief">
          <h3>{L.id === 'X' ? 'Detour cleared' : 'Unlocked'}</h3>
          <p><Html html={L.debrief} /></p>
          <button className="btn btn-primary" type="button" autoFocus onClick={() => e.act('next')} data-a="next">{L.next === 'END' ? 'Close the case' : L.next === 'D' ? 'Continue' : 'Next lock'}</button>
        </div>
      );
    }
  }
  return (
    <>
      <section className="lock"><h2>{L.name}</h2>{body}{deb}</section>
      <p className="foot">
        {confirmLeave ? (
          <><span>Lose this team’s progress on this phone? </span><button className="linkish danger" type="button" onClick={() => e.act('leave')}>Yes, leave</button><button className="linkish" type="button" onClick={() => setConfirmLeave(false)}>Cancel</button></>
        ) : <button className="linkish" type="button" onClick={() => setConfirmLeave(true)}>Leave this game</button>}
      </p>
    </>
  );
}

function InjectCard({ e }: { e: TeamEngine }) {
  const I = injectById(e.P.pendingInject);
  if (!I) return null;
  const picked = e.P.injectChoice;
  return (
    <section className="lock">
      <div className="inject-card">
        <span className="tag">Surprise event</span>
        <h2 style={{ margin: '4px 0 8px' }}>{I.name}</h2>
        <DecisionBody prompt={I.prompt} options={I.options} picked={picked} onPick={(id) => e.act('inj', id)} action="inj" />
        {picked ? <div className="row"><button className="btn btn-primary" type="button" onClick={() => e.act('injdone')} data-a="injdone">Back to the case</button></div>
          : <p className="small" style={{ margin: '10px 0 0' }}>Answer to carry on. The clock is running.</p>}
      </div>
    </section>
  );
}

/* ---------- finished ---------- */
function Done({ e }: { e: TeamEngine }) {
  const P = e.P, m = e.M(), oc = P.outcome || { key: 'full', label: '' };
  const final = P.finalBase + (e.ctl.adj || 0);
  const used = [P.askIt ? 'Ask IT' : '', P.fiftyUsed ? '50:50' : ''].filter(Boolean).join(' and ');
  return (
    <section className="done">
      <Shield filled={4} className="big" reveal />
      <span className={'tag' + (oc.key === 'damage' || oc.key === 'stopped' ? ' x' : '')}>{e.S.title} · {m.label}</span>
      <h1>{oc.label}</h1>
      <p className="team">{P.name}</p>
      <p className="final">{fmt(final)}</p>
      <p className="muted">
        {P.wrong} wrong · {P.pen}s added{e.ctl.adj ? ' · ' + (e.ctl.adj > 0 ? '+' : '') + e.ctl.adj + 's adjustment' : ''} · {used ? used + ' used' : 'no lifelines used'}
      </p>
      <Vote e={e} />
      {P.choices.length ? (
        <>
          <h2 className="sub-h">Your decisions</h2>
          <ul className="choicelog">{P.choices.map((c, i) => <li key={i}><span className={'q-' + c.q}>{c.q === 'best' ? 'Strong' : c.q === 'ok' ? 'Could be better' : 'Risky'}:</span> <Html html={c.label} /></li>)}</ul>
        </>
      ) : null}
      <h2 className="sub-h">What your team practised</h2>
      <ol className="lessons">{e.S.lessons.map((l) => <li key={l}>{l}</li>)}</ol>
      <p className="small saved">Result saved. Your facilitator will announce the winners. Backup code <span className="vcode-inline">{makeVerifyCode(P.name, final, gameIndex(e.gid), P.mode === 'x')}</span></p>
    </section>
  );
}

function Vote({ e }: { e: TeamEngine }) {
  const P = e.P;
  if (!P.insider) return null;
  const s = e.seats(), rv = e.ctl.reveal;
  if (rv) {
    return (
      <div className={'conseq ' + (rv.correct ? 'best' : 'poor')} style={{ margin: '14px 0' }}>
        <h3>{rv.correct ? 'You caught the Insider!' : 'The Insider fooled you'}</h3>
        <p style={{ margin: 0 }}>The Insider was <strong>{rv.seat || 'nobody'}</strong>.{rv.voteSeat ? ' You voted for ' + rv.voteSeat + '.' : ''} {rv.correct ? '60 seconds taken off your time.' : '60 seconds added to your time.'}</p>
      </div>
    );
  }
  if (!s.length) return null;
  if (P.vote) {
    const vs = s.find((x) => x.uid === P.vote);
    return <div className="conseq ok" style={{ margin: '14px 0' }}><h3>Vote locked: {vs ? vs.seat : ''}</h3><p style={{ margin: 0 }}>Your facilitator will reveal the Insider.</p></div>;
  }
  return (
    <div className="inject-card" style={{ margin: '14px 0' }}>
      <span className="tag">Insider round</span>
      <h2 style={{ margin: '4px 0 6px' }}>Who was the Insider?</h2>
      <p className="small" style={{ margin: '0 0 8px' }}>Agree as a team, then vote once. Catch them and you lose 60 seconds; miss and you gain 60.</p>
      <div className="choices">
        {s.map((x) => <button key={x.uid} type="button" className="choice radio" onClick={() => e.act('vote', x.uid)} data-a="vote" data-v={x.uid}><span className="box"><Check /></span><span>{x.seat}</span></button>)}
      </div>
    </div>
  );
}
