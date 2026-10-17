'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { getStore, type Json } from './store';
import { isMuted, onMuteChange } from './sound';

/** Live value at a database path. undefined while loading, null when empty. */
export function useDb<T = Json>(path: string | null): T | null | undefined {
  const [val, setVal] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    if (!path) { setVal(undefined); return; }
    setVal(undefined);
    return getStore().on(path, (v) => setVal(v as T | null));
  }, [path]);
  return val;
}

/** Re-renders every `ms` milliseconds and returns the store's clock. */
export function useNow(ms = 1000): number {
  const [, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT((x) => x + 1), ms); return () => clearInterval(id); }, [ms]);
  return getStore().now();
}

/** True after the first client render: lets pages avoid server/client mismatches. */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

export function useMuted(): boolean {
  return useSyncExternalStore(onMuteChange, isMuted, () => false);
}
