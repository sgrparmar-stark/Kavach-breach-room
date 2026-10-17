import type { Metadata } from 'next';
import HostApp from '@/components/host/HostApp';

export const metadata: Metadata = { title: 'Host · Kavach Breach Room' };

export default function Page() {
  return <HostApp />;
}
