/* The Kavach report: a per-team learning summary built from what the team actually did.
   Every lock, decision and surprise event is rated, and each rating maps to authored feedback in data/scenarios.ts. */
import type { Topic, Lock } from '@/data/scenarios';
import { graph, injectById, isLockNode, type NodeId } from './game';
import type { Tally } from './scoring';

export const TOPICS: Record<Topic, { label: string; badge: string }> = {
  phishing: { label: 'Phishing', badge: 'Phish Spotter' },
  identity: { label: 'Sign-in and MFA', badge: 'Gatekeeper' },
  data: { label: 'Data handling', badge: 'Data Guardian' },
  fraud: { label: 'Payment fraud', badge: 'Fraud Buster' },
  response: { label: 'Incident response', badge: 'First Responder' },
  reporting: { label: 'Reporting duties', badge: 'Compliance Compass' },
  physical: { label: 'Physical security', badge: 'Door Keeper' },
  cloud: { label: 'Cloud security', badge: 'Cloud Sentinel' },
  supply: { label: 'Software supply chain', badge: 'Supply Chain Sleuth' },
  secrets: { label: 'Secrets and keys', badge: 'Secret Keeper' },
  insider: { label: 'Insider risk', badge: 'Insider Watch' },
  social: { label: 'Social engineering', badge: 'Con Detector' },
  vendor: { label: 'Third-party risk', badge: 'Vendor Vigilant' },
  leadership: { label: 'Crisis leadership', badge: 'Crisis Captain' },
  comms: { label: 'Crisis communication', badge: 'Clear Voice' },
  governance: { label: 'Governance and support', badge: 'Steady Hand' },
};
export const TOPIC_ORDER = Object.keys(TOPICS) as Topic[];

export type Rating = 'strong' | 'good' | 'focus' | 'skip';
export const RATING_LABEL: Record<Rating, string> = { strong: 'Strong', good: 'Good', focus: 'Focus area', skip: 'Not reached' };
const RATING_VALUE: Record<Rating, number> = { strong: 3, good: 2, focus: 1, skip: 0 };

export interface StepRep {
  id: string; title: string; kind: 'lock' | 'detour' | 'decision' | 'surprise'; topic: Topic; rating: Rating;
  wrong: number; lifeline: boolean; good: string; gap: string; act: string;
  /** What the team chose, when it was wrong or risky. */ chose?: string;
  /** Why that choice was a problem, when the content says so. */ why?: string;
}
export interface Report {
  steps: StepRep[]; strengths: StepRep[]; focus: StepRep[]; actions: string[];
  badge: { topic: Topic; label: string; name: string } | null;
  topics: Partial<Record<Topic, number>>;
}

const strip = (h: string) => String(h || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();

/** Turns a recorded wrong answer into words. */
export function describeWrong(L: Lock, o: string): { chose: string; why?: string } {
  switch (L.type) {
    case 'choice': { const x = L.options.find((p) => p.id === o); return { chose: strip(x?.text || o), why: x?.why }; }
    case 'pick': {
      const ids = o.split(',').filter(Boolean);
      const badPick = ids.map((id) => L.items.find((i) => i.id === id)).find((i) => i && !i.bad);
      return { chose: ids.map((id) => strip(L.items.find((i) => i.id === id)?.text || id)).join('; '), why: badPick?.why };
    }
    case 'spot': { const x = L.items.find((i) => i.id === o); return { chose: 'Tapped “' + strip(x?.html || o) + '”, which was normal' }; }
    case 'code': return { chose: 'Entered ' + (o || '?') };
    case 'order': {
      const txt = (id: string) => strip(L.steps.find((s) => s.id === id)?.text || id);
      return { chose: 'Order tried: ' + o.split(',').filter(Boolean).map((id, i) => i + 1 + '. ' + txt(id)).join(' ') };
    }
  }
}

export function buildReport(gid: string, T: Tally): Report {
  const G = graph(gid), steps: StepRep[] = [];
  const order: NodeId[] = ['L1', 'L2', 'L3', 'D', 'X', 'L4', 'L5', 'L6'];
  for (const id of order) {
    const n = G[id], s = T.nodes[id];
    if (n.type === 'end') continue;
    if (id === 'X' && !s) continue;
    if (n.type === 'decision') {
      const opt = s?.choice ? n.options.find((o) => o.id === s.choice) : undefined;
      const rating: Rating = !opt ? 'skip' : opt.q === 'best' ? 'strong' : opt.q === 'ok' ? 'good' : 'focus';
      steps.push({ id, title: n.name, kind: 'decision', topic: n.topic || 'response', rating, wrong: 0, lifeline: false, good: n.good || '', gap: n.gap || '', act: n.act || '',
        chose: opt && opt.q !== 'best' ? strip(opt.text) : undefined, why: opt && opt.q !== 'best' ? opt.note : undefined });
      continue;
    }
    if (!isLockNode(n)) continue;
    const reached = !!s && (s.solved || s.wrong > 0 || !!s.enterAt);
    const life = !!s && (s.askIt || s.fifty || s.hint);
    let rating: Rating = 'skip';
    if (s?.solved) rating = s.wrong === 0 && !life ? 'strong' : s.wrong <= 1 ? 'good' : 'focus';
    else if (reached && s && s.wrong > 0) rating = 'focus';
    const last = s && s.wrongOpts.length ? describeWrong(n, s.wrongOpts[s.wrongOpts.length - 1]) : null;
    steps.push({ id, title: n.name, kind: id === 'X' ? 'detour' : 'lock', topic: n.topic || 'response', rating, wrong: s?.wrong || 0, lifeline: life,
      good: n.good || '', gap: n.gap || '', act: n.act || '', chose: last?.chose, why: last?.why });
  }
  T.inj.forEach((x, i) => {
    const I = injectById(x.id), opt = I?.options.find((o) => o.id === x.opt);
    if (!I || !opt) return;
    const rating: Rating = opt.q === 'best' ? 'strong' : opt.q === 'ok' ? 'good' : 'focus';
    steps.push({ id: 'inject:' + x.id + ':' + i, title: I.name, kind: 'surprise', topic: I.topic || 'response', rating, wrong: 0, lifeline: false,
      good: opt.q === 'best' ? opt.note : '', gap: opt.q === 'best' ? '' : opt.note.replace(/\s*\+\d+ seconds\.?/, ''), act: I.act || '',
      chose: opt.q === 'best' ? undefined : strip(opt.text) });
  });

  const strengths = steps.filter((s) => s.rating === 'strong').slice(0, 3);
  const focus = [...steps.filter((s) => s.rating === 'focus' && s.kind === 'decision'), ...steps.filter((s) => s.rating === 'focus' && s.kind !== 'decision')].slice(0, 3);
  const actions: string[] = [];
  const addAct = (a: string) => { if (a && !actions.includes(a) && actions.length < 3) actions.push(a); };
  focus.forEach((s) => addAct(s.act));
  steps.filter((s) => s.rating === 'good').forEach((s) => addAct(s.act));
  steps.filter((s) => s.rating === 'focus').forEach((s) => addAct(s.act));
  steps.filter((s) => s.rating === 'strong').forEach((s) => addAct(s.act));

  const sum: Partial<Record<Topic, number[]>> = {};
  steps.filter((s) => s.rating !== 'skip').forEach((s) => { (sum[s.topic] ??= []).push(RATING_VALUE[s.rating]); });
  const topics: Partial<Record<Topic, number>> = {};
  (Object.keys(sum) as Topic[]).forEach((k) => { const v = sum[k] as number[]; topics[k] = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10; });

  const strongBy: Partial<Record<Topic, number>> = {};
  steps.filter((s) => s.rating === 'strong').forEach((s) => { strongBy[s.topic] = (strongBy[s.topic] || 0) + 1; });
  let badge: Report['badge'] = null, best = 0;
  TOPIC_ORDER.forEach((k) => { const c = strongBy[k] || 0; if (c > best) { best = c; badge = { topic: k, label: TOPICS[k].label, name: TOPICS[k].badge }; } });
  return { steps, strengths, focus, actions, badge, topics };
}
