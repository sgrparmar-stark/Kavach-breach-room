'use client';
import type { SpotLock, CodeLock, PickLock, ChoiceLock, OrderLock, DecisionOption, Lock } from '@/data/scenarios';
import type { TeamEngine } from './engine';
import { Html, Check } from '@/components/ui';

type P<L> = { L: L; e: TeamEngine; done: boolean };
const TONES = new Set(['ok', 'bad', 'info']);

export function SpotView({ L, e, done }: P<SpotLock>) {
  const c = e.P.cur, pen = e.M().pen;
  const need = L.items.filter((x) => x.flag).length;
  const item = (x: SpotLock['items'][number]) => {
    const found = c.sel.includes(x.id) || (done && !!x.flag);
    const cleared = c.x.includes(x.id), ruled = c.fifty.includes(x.id);
    const cls = 'spot' + (found ? ' found' : '') + (cleared || ruled ? ' cleared' : '') + (e.shakeId === x.id ? ' shake' : '');
    return (
      <button key={x.id} type="button" className={cls} disabled={done || ruled} onClick={() => e.act('spot', x.id)} data-v={x.id} data-a="spot">
        {x.head ? (<><span className="k">{x.head}</span> <Html html={x.html} className="v" /></>) : <Html html={x.html} />}
        {found && x.note ? <span className="note">{x.note}</span> : cleared ? <span className="note">This part is normal.</span> : ruled ? <span className="note">Ruled out by 50:50.</span> : null}
      </button>
    );
  };
  const heads = L.items.filter((x) => x.head), body = L.items.filter((x) => !x.head);
  return (
    <>
      <p className="task">{L.task} Tapping a normal part adds {pen} seconds.</p>
      <p className="count"><strong>{done ? need : c.sel.length} of {need}</strong> warning signs found</p>
      <div className={'frame ' + (L.frame === 'note' ? 'note-frame' : L.frame)}>
        {L.frame === 'chat' ? <div className="frame-head"><div className="chat-name">{L.chatName}</div><div className="sub">{L.chatSub}</div></div>
          : L.frame === 'code' ? <div className="frame-head">{L.fileName}</div>
          : heads.length ? <div className="frame-head">{heads.map(item)}</div> : null}
        <div className="frame-body">{body.map(item)}</div>
      </div>
    </>
  );
}

export function CodeView({ L, e, done }: P<CodeLock>) {
  const c = e.P.cur, val = done ? L.answer : c.code;
  let k = 0;
  const slots = L.mask.split('').map((ch, i) => {
    if (ch !== '#') return <b key={i}>{ch}</b>;
    const d = val[k], locked = k < c.fiftyCode.length; k++;
    return <span key={i} className={(d ? 'fill' : '') + (locked && !done ? ' given' : '')}>{d || ''}</span>;
  });
  const key = (d: string) => <button key={d} type="button" onClick={() => e.act('key', d)} aria-label={d} data-a="key" data-v={d}>{d}</button>;
  return (
    <>
      <p className="task">{L.task}</p>
      {L.pre ? <Html as="div" html={L.pre} /> : null}
      <div className="log-wrap">
        <table>
          <thead><tr>{L.cols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {L.rows.map((r0, ri) => {
              const r = r0.slice(); const tone = TONES.has(r[r.length - 1]) ? (r.pop() as string) : '';
              return <tr key={ri}>{r.map((cell, i) => <td key={i} className={i === 0 ? 't' : i === r.length - 1 && tone ? 'r-' + tone : undefined}><Html html={cell} /></td>)}</tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className={'slots' + (L.answer.length > 4 ? ' long' : '') + (done ? ' ok' : '') + (e.shakeId === 'code' ? ' shake' : '')} aria-label={'Entered: ' + (val || 'nothing')}>{slots}</div>
      {done ? null : (
        <div className="keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key)}
          <button type="button" className="wide" onClick={() => e.act('del')} data-a="del">Delete</button>
          {key('0')}
          <button type="button" className="wide go" onClick={() => e.act('checkcode')} data-a="checkcode">Check</button>
        </div>
      )}
    </>
  );
}

export function PickView({ L, e, done }: P<PickLock>) {
  const c = e.P.cur, need = L.items.filter((x) => x.bad).length;
  return (
    <>
      <p className="task">{L.task}</p>
      <div className="choices">
        {L.items.map((h) => {
          const ruled = c.fifty.includes(h.id);
          const on = done ? !!h.bad : c.picks.includes(h.id);
          const cls = 'choice' + (done ? (h.bad ? ' right' : ' dim') : ruled ? ' dim ruled' : '');
          return (
            <button key={h.id} type="button" className={cls} aria-pressed={on} disabled={done || ruled} onClick={() => e.act('pick', h.id)} data-a="pick" data-v={h.id}>
              <span className="box"><Check /></span>
              <span><Html html={h.text} />{done && h.why ? <span className="why">{h.why}</span> : ruled ? <span className="why">Ruled out by 50:50</span> : null}</span>
            </button>
          );
        })}
      </div>
      {done ? null : (
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={c.picks.length !== need} onClick={() => e.act('checkpick')} data-a="checkpick">Check answer</button>
          <span className="muted">{c.picks.length} of {need} picked</span>
        </div>
      )}
    </>
  );
}

export function ChoiceView({ L, e, done }: P<ChoiceLock>) {
  const c = e.P.cur;
  return (
    <>
      <p className="task">{L.task} A wrong choice adds {e.M().pen} seconds.</p>
      <div className="choices">
        {L.options.map((o) => {
          const w = c.elim.includes(o.id), ruled = c.fifty.includes(o.id);
          const cls = 'choice radio' + (done && o.right ? ' right' : '') + (w ? ' wrong' : '') + (ruled ? ' dim ruled' : '') + (done && !o.right && !w && !ruled ? ' dim' : '');
          return (
            <button key={o.id} type="button" className={cls} disabled={done || w || ruled} onClick={() => e.act('choose', o.id)} data-a="choose" data-v={o.id}>
              <span className="box"><Check /></span>
              <span><Html html={o.text} />{(w || done) && o.why ? <span className="why">{o.why}</span> : ruled ? <span className="why">Removed by 50:50</span> : null}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function OrderView({ L, e, done }: P<OrderLock>) {
  const c = e.P.cur;
  const correct = L.steps.map((s) => s.id);
  const list = done ? correct : L.shown, seq = done ? correct : c.seq;
  const txt: Record<string, string> = {}; L.steps.forEach((s) => { txt[s.id] = s.text; });
  return (
    <>
      <p className="task">{L.task}</p>
      <div className={'choices' + (done ? ' solved' : '')}>
        {list.map((id) => {
          const n = seq.indexOf(id) + 1, given = c.fifty.includes(id) && !done;
          return (
            <button key={id} type="button" className={'order' + (n ? ' set' : '') + (given ? ' given' : '')} disabled={done || given} onClick={() => e.act('step', id)} data-a="step" data-v={id}
              aria-label={(n ? 'Step ' + n + ': ' : 'Not placed: ') + txt[id]}>
              <span className="num">{n || ''}</span><span><Html html={txt[id]} />{given ? <span className="why">Placed by 50:50</span> : null}</span>
            </button>
          );
        })}
      </div>
      {done ? null : (
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={c.seq.length !== list.length} onClick={() => e.act('checkorder')} data-a="checkorder">Check order</button>
          <button type="button" className="btn btn-quiet" disabled={c.seq.length <= c.fifty.length} onClick={() => e.act('clearorder')} data-a="clearorder">Clear</button>
        </div>
      )}
    </>
  );
}

export function LockBody({ L, e, done }: { L: Lock; e: TeamEngine; done: boolean }) {
  switch (L.type) {
    case 'spot': return <SpotView L={L} e={e} done={done} />;
    case 'code': return <CodeView L={L} e={e} done={done} />;
    case 'pick': return <PickView L={L} e={e} done={done} />;
    case 'choice': return <ChoiceView L={L} e={e} done={done} />;
    case 'order': return <OrderView L={L} e={e} done={done} />;
  }
}

/** A decision or surprise event: every option is accepted, but each has a consequence. */
export function DecisionBody({ prompt, options, picked, onPick, action }: { prompt: string; options: DecisionOption[]; picked: string | null; onPick: (id: string) => void; action: string }) {
  const o = picked ? options.find((x) => x.id === picked) : null;
  return (
    <>
      <p className="task">{prompt}</p>
      <div className="choices">
        {options.map((x) => (
          <button key={x.id} type="button" className={'choice radio' + (picked ? (picked === x.id ? ' right' : ' dim') : '')} disabled={!!picked} aria-pressed={picked === x.id} onClick={() => onPick(x.id)} data-a={action} data-v={x.id}>
            <span className="box"><Check /></span><span><Html html={x.text} /></span>
          </button>
        ))}
      </div>
      {o ? (
        <div className={'conseq ' + o.q}>
          <h3>{o.q === 'best' ? 'Strong call' : o.q === 'ok' ? 'Could be better' : 'That made things worse'}</h3>
          <p style={{ margin: 0 }}>{o.note}</p>
        </div>
      ) : null}
    </>
  );
}
