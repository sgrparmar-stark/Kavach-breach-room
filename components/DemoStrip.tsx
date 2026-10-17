'use client';
import { ArrowLeft } from 'lucide-react';
import { getStore } from '@/lib/store';
import { go } from '@/lib/nav';

/** Shown only when no database is configured: explains demo mode and offers a way back. */
export function DemoStrip({ where }: { where: string }) {
  const s = getStore();
  if (s.mode !== 'demo') return null;
  return (
    <div className="demo-strip">
      <button type="button" className="backbtn" onClick={() => go('/')} data-a="demo-home"><ArrowLeft size={14} aria-hidden /> Back to start</button>
      <span>Demo mode · {where} · data stays in this browser{s.persistent ? '' : ' tab'}</span>
    </div>
  );
}
