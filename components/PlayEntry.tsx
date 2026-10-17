'use client';
import { useEffect, useState } from 'react';
import TeamApp from '@/components/team/TeamApp';
import MemberApp from '@/components/member/MemberApp';
import { gameById } from '@/lib/game';
import { useDb, useMounted } from '@/lib/hooks';
import { go } from '@/lib/nav';
import { Shield } from '@/components/ui';
import { setStoreRole } from '@/lib/store';

/** /play?room=1234 · /play?game=leak · /play?game=leak&join=<team> (Insider round teammate) */
export default function PlayEntry({ search }: { search?: string }) {
  setStoreRole('team');
  const mounted = useMounted();
  const [q, setQ] = useState<URLSearchParams | null>(null);
  useEffect(() => { setQ(new URLSearchParams(search ?? window.location.search)); }, [search]);
  const room = q?.get('room') || '';
  const roomGid = useDb<string>(room ? 'rooms/' + room.replace(/\D/g, '') : null);
  if (!mounted || !q) return null;

  const game = q.get('game') || '', join = q.get('join') || '';
  if (join && gameById(game)) return <MemberApp gid={game} team={join} />;
  if (gameById(game)) return <TeamApp gid={game} />;
  if (room) {
    if (roomGid === undefined) return <main className="wrap"><p className="muted">Finding your game…</p></main>;
    if (roomGid && gameById(roomGid)) return <TeamApp gid={roomGid} />;
  }
  return (
    <main className="wrap">
      <div className="hero"><Shield className="hero" /><div><span className="tag">Kavach Breach Room</span><h1>Game not found</h1></div></div>
      <p className="lede">{room ? 'No game uses room code ' + room + '.' : 'This link doesn’t point to a game.'} Scan your table’s QR code again, or type the room code.</p>
      <button className="btn btn-primary" type="button" onClick={() => go('/')}>Enter a room code</button>
    </main>
  );
}
