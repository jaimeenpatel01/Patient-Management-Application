/**
 * NetworkContext.tsx
 *
 * Monitors network connectivity via @react-native-community/netinfo.
 * On offline→online transition it runs the sync engine.
 * Also warms the cache on first launch (while online).
 *
 * Exposes: isOnline, pendingSyncCount, isSyncing, lastSyncedAt
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import NetInfo from '@react-native-community/netinfo';

import { setIsOnline } from '@/lib/networkState';
import { setUserId } from '@/lib/networkState';
import { getCount } from '@/lib/syncQueue';
import { processQueue } from '@/lib/syncEngine';
import * as offlineCache from '@/lib/offlineCache';

// ─── Cache warming ─────────────────────────────────────────────────────────────
// Pre-fetch and cache key collections on first online launch so the app
// has fresh data for its first offline session.
import { getPatients } from '@/services/patientService';
import { getAttendances } from '@/services/attendanceService';
import { getPayments } from '@/services/paymentService';

async function warmCache(): Promise<void> {
  try {
    const [patientsRes, attendancesRes, paymentsRes] = await Promise.allSettled([
      getPatients('all'),
      getAttendances(undefined, 0, 100),
      getPayments(0, 100),
    ]);

    if (patientsRes.status === 'fulfilled' && patientsRes.value.data?.length) {
      await offlineCache.setCollection('patients', patientsRes.value.data);
    }
    if (attendancesRes.status === 'fulfilled' && attendancesRes.value.data?.length) {
      await offlineCache.setCollection('attendances', attendancesRes.value.data);
    }
    if (paymentsRes.status === 'fulfilled' && paymentsRes.value.data?.length) {
      await offlineCache.setCollection('payments', paymentsRes.value.data);
    }
  } catch {
    // Non-critical
  }
}

// ─── Context shape ─────────────────────────────────────────────────────────────

export interface NetworkContextValue {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
}

export const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  pendingSyncCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
});

// ─── Provider ──────────────────────────────────────────────────────────────────

interface NetworkProviderProps {
  children: React.ReactNode;
  /** Pass the authenticated user's ID so the module-level singleton stays in sync. */
  userId?: string | null;
}

export function NetworkProvider({ children, userId }: NetworkProviderProps) {
  const [isOnline, setIsOnlineState] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const wasOnline = useRef(true);
  const cacheWarmed = useRef(false);

  // Keep the module-level singleton up-to-date
  useEffect(() => {
    setUserId(userId ?? null);
  }, [userId]);

  const refreshPendingCount = useCallback(async () => {
    const count = await getCount();
    setPendingSyncCount(count);
  }, []);

  const runSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await processQueue();
      setLastSyncedAt(new Date());
      await refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    // Read initial pending count
    refreshPendingCount();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);

      setIsOnlineState(online);
      setIsOnline(online); // module-level singleton

      if (online && !wasOnline.current) {
        // Just came back online — trigger sync
        runSync();
      }

      if (online && !cacheWarmed.current) {
        cacheWarmed.current = true;
        warmCache();
      }

      wasOnline.current = online;
    });

    return unsubscribe;
  }, [runSync, refreshPendingCount]);

  return (
    <NetworkContext.Provider
      value={{ isOnline, pendingSyncCount, isSyncing, lastSyncedAt }}
    >
      {children}
    </NetworkContext.Provider>
  );
}
