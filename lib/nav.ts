/* Navigation and base address, swappable so the same screens can run inside a single-page demo. */
type Navigator = (href: string) => void;
let navigator_: Navigator = (href) => { window.location.href = href; };
let base_: (() => string) | null = null;

export function setNavigator(fn: Navigator) { navigator_ = fn; }
export function go(href: string) { navigator_(href); }
export function setBaseUrl(fn: (() => string) | null) { base_ = fn; }
/** The public address of this site, used in QR codes. */
export function baseUrl(): string {
  if (base_) return base_();
  return typeof window === 'undefined' ? '' : window.location.origin;
}
export function playUrl(params: Record<string, string> = {}): string {
  const b = baseUrl();
  if (!b) return '';
  const q = new URLSearchParams(params).toString();
  return b.replace(/\/$/, '') + '/play' + (q ? '?' + q : '');
}
