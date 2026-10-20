'use client';
import { useEffect, useState } from 'react';
import TeamApp from '@/components/team/TeamApp';
import MemberApp from '@/components/member/MemberApp';
import { useMounted } from '@/lib/hooks';
import { setStoreRole } from '@/lib/store';

/** /play: one QR code for the whole event. /play?join=<team>: an Insider-round teammate. */
export default function PlayEntry({ search }: { search?: string }) {
  setStoreRole('team');
  const mounted = useMounted();
  const [q, setQ] = useState<URLSearchParams | null>(null);
  useEffect(() => { setQ(new URLSearchParams(search ?? window.location.search)); }, [search]);
  useEffect(() => { document.body.classList.add('lq'); return () => document.body.classList.remove('lq'); }, []);
  if (!mounted || !q) return null;
  const join = q.get('join') || '';
  if (join) return <MemberApp team={join} />;
  return <TeamApp />;
}
