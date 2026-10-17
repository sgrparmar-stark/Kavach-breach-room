import type { Metadata } from 'next';
import PlayEntry from '@/components/PlayEntry';

export const metadata: Metadata = { title: 'Play · Kavach Breach Room' };

export default function Page() {
  return <PlayEntry />;
}
