import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Chakra_Petch, Hind, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const display = Chakra_Petch({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' });
const body = Hind({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Kavach Breach Room',
  description: 'A team cyber escape game for Cybersecurity Awareness Month.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#1B1F3B' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
