'use client';
import { graph, NODE_ORDER, type NodeId } from '@/lib/game';
import type { Json } from '@/lib/store';

const POS: Record<NodeId, [number, number]> = {
  L1: [220, 26], L2: [220, 84], L3: [220, 142], D: [220, 204], X: [340, 268], L4: [220, 332], L5: [220, 390], L6: [220, 448], END: [220, 506],
};
const EDGES: [NodeId, NodeId, string?, number?, number?][] = [
  ['L1', 'L2'], ['L2', 'L3'], ['L3', 'D'], ['D', 'L4', 'best / ok', 150, 272], ['D', 'X', 'poor choice', 300, 228], ['X', 'L4'], ['L4', 'L5'], ['L5', 'L6'], ['L6', 'END'],
];

/** The game tree for one team: where they've been, where they are, and which step the facilitator has selected. */
export default function Tree({ gid, p, picked, onPick }: { gid: string; p: Json; picked: NodeId | null; onPick: (n: NodeId | null) => void }) {
  const gr = graph(gid), path: NodeId[] = p.path || [];
  const finished = p.status === 'finished';
  const cur: NodeId | '' = finished ? 'END' : p.node || '';
  const edge = ([a, b, label, lx, ly]: [NodeId, NodeId, string?, number?, number?]) => {
    let on = false;
    for (let i = 0; i < path.length - 1; i++) if (path[i] === a && path[i + 1] === b) on = true;
    if (b === 'END' && path[path.length - 1] === 'L6' && finished && p.outcomeKey !== 'stopped') on = true;
    const A = POS[a], B = POS[b];
    let d: string;
    if (a === 'D' && b === 'X') d = `M${A[0] + 60} ${A[1] + 12} L${B[0]} ${B[1] - 18}`;
    else if (a === 'X') d = `M${A[0]} ${A[1] + 18} L${B[0] + 110} ${B[1] - 8}`;
    else d = `M${A[0]} ${A[1] + (a === 'D' ? 24 : 18)} L${B[0]} ${B[1] - (b === 'D' ? 24 : 18)}`;
    return (
      <g key={a + b}>
        <path className={'edge' + (on ? ' on' : '')} d={d} />
        {label ? <text className="elab" x={lx} y={ly}>{label}</text> : null}
      </g>
    );
  };
  const node = (id: NodeId) => {
    const n = gr[id], P0 = POS[id];
    const vis = path.includes(id) || (id === 'END' && finished);
    const cls = 'nd' + (vis ? ' visited' : '') + (id === cur ? ' cur' : '') + (picked === id ? ' pick' : '') + (id === 'END' && finished ? ' done' : '');
    const lbl = n.label.length > 30 ? n.label.slice(0, 29) + '…' : n.label;
    return (
      <g key={id} className={cls} role="button" tabIndex={0} aria-label={n.label} data-node={id}
        onClick={() => onPick(id === 'END' ? null : id)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') onPick(id === 'END' ? null : id); }}>
        {id === 'D'
          ? <polygon points={`${P0[0]},${P0[1] - 24} ${P0[0] + 120},${P0[1]} ${P0[0]},${P0[1] + 24} ${P0[0] - 120},${P0[1]}`} />
          : <rect x={P0[0] - (id === 'X' ? 80 : 110)} y={P0[1] - 18} width={id === 'X' ? 160 : 220} height={36} rx={9} />}
        <text x={P0[0]} y={P0[1] + 4} textAnchor="middle">{lbl}</text>
      </g>
    );
  };
  return (
    <svg className="tree" viewBox="0 0 440 534" role="img" aria-label="Game tree">
      {EDGES.map(edge)}
      {NODE_ORDER.map(node)}
    </svg>
  );
}
