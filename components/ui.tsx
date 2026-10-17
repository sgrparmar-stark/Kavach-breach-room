'use client';
import { useId, type CSSProperties, type ReactNode } from 'react';
import QRCode from 'react-qr-code';
import { Volume2, VolumeX } from 'lucide-react';
import { useMuted } from '@/lib/hooks';
import { setMuted, unlockAudio } from '@/lib/sound';

const SHIELD_PATH = 'M20 2L37 8V22C37 33.5 29.5 41.5 20 46C10.5 41.5 3 33.5 3 22V8Z';

/** The Kavach shield. `filled` bands (0-4) show progress through the locks. */
export function Shield({ filled = 0, className = '', reveal = false, onClick }: { filled?: number; className?: string; reveal?: boolean; onClick?: () => void }) {
  const id = 'clip' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const bands = [35, 24, 13, 2];
  return (
    <svg className={'shield ' + className + (reveal ? ' reveal' : '')} viewBox="0 0 40 48" aria-hidden="true" onClick={onClick}>
      <defs><clipPath id={id}><path d={SHIELD_PATH} /></clipPath></defs>
      <g clipPath={'url(#' + id + ')'}>
        <rect x="0" y="0" width="40" height="48" className="sh-bg" />
        {bands.map((y, i) => (
          <rect key={y} x="0" y={y} width="40" height="11" className={'sh-band' + (i < filled ? ' on' : '')} style={{ '--d': i } as CSSProperties} />
        ))}
        <path d="M0 13H40M0 24H40M0 35H40" className="sh-seams" />
      </g>
      <path d={SHIELD_PATH} className="sh-edge" />
    </svg>
  );
}

/** Renders authored game text that may contain simple markup. Never use for anything a player typed. */
export function Html({ html, as = 'span', className }: { html: string; as?: 'span' | 'div' | 'p'; className?: string }) {
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Pill({ kind, children }: { kind: string; children: ReactNode }) {
  return <span className={'pill ' + kind}><span className="dot" />{children}</span>;
}

export function QRBox({ value, size = 220, label, className = '' }: { value: string; size?: number; label?: string; className?: string }) {
  return (
    <div className={'qrbox ' + className} role="img" aria-label={label || 'QR code'}>
      <QRCode value={value} size={size} level="M" style={{ width: '100%', height: 'auto', maxWidth: size, display: 'block' }} />
    </div>
  );
}

export function MuteButton({ className = '' }: { className?: string }) {
  const muted = useMuted();
  return (
    <button type="button" className={'mute ' + className} aria-pressed={muted} aria-label={muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}
      onClick={() => { unlockAudio(); setMuted(!muted); }}>
      {muted ? <VolumeX size={20} aria-hidden /> : <Volume2 size={20} aria-hidden />}
    </button>
  );
}

const CHECK_PATH = 'M3 8.5l3 3 7-7';
export function Check() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d={CHECK_PATH} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
