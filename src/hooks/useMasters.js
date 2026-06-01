import { useState, useEffect, useCallback } from 'react';
import { hydrateAllMasters } from '../services/masterStorage.js';

/** Pastikan master IndexedDB/seed sudah di-cache sebelum combo dipakai */
export function useMasters() {
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(async () => {
    await hydrateAllMasters();
    setReady(true);
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    hydrateAllMasters().then(() => {
      if (!cancelled) {
        setReady(true);
        setTick((n) => n + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { mastersReady: ready, mastersTick: tick, reloadMasters: reload };
}
