/**
 * wrappers.ts
 *
 * Generic Higher-Order Functions for offline-aware service calls.
 *
 * withOfflineRead  — transparent read-through cache
 * withOfflineWrite — optimistic write + mutation queue
 *
 * Both wrappers preserve the existing { data, error } API so screens
 * don't need to change how they handle results.
 */

import { getIsOnline, getUserId } from '@/lib/networkState';
import * as offlineCache from '@/lib/offlineCache';
import * as syncQueue from '@/lib/syncQueue';
import * as Crypto from 'expo-crypto';

// ─── Read wrapper ──────────────────────────────────────────────────────────────

export interface ReadCacheConfig<T> {
  /** Read from cache with this function */
  readCache: () => Promise<T | null>;
  /** Write to cache after a successful network fetch */
  writeCache: (data: T) => Promise<void>;
}

/**
 * Wraps a read service function with offline fallback.
 *
 * Online:  call service → on success cache result → return data
 *          on network failure → fall back to cache
 * Offline: read from cache (or return error if no cached data)
 */
export function withOfflineRead<TArgs extends unknown[], TData>(
  serviceFn: (...args: TArgs) => Promise<{ data: TData; error: string | null }>,
  cacheConfig: ReadCacheConfig<TData>,
): (...args: TArgs) => Promise<{ data: TData; error: string | null }> {
  return async (...args: TArgs) => {
    if (getIsOnline()) {
      try {
        const result = await serviceFn(...args);
        if (!result.error && result.data !== null && result.data !== undefined) {
          await cacheConfig.writeCache(result.data);
        }
        if (result.error) {
          // Network call succeeded but returned a logical error — try cache
          const cached = await cacheConfig.readCache();
          if (cached !== null) return { data: cached, error: null };
        }
        return result;
      } catch {
        // Network failure — fall back to cache
        const cached = await cacheConfig.readCache();
        if (cached !== null) return { data: cached, error: null };
        return { data: null as unknown as TData, error: 'Network error and no cached data available' };
      }
    }

    // Offline path
    const cached = await cacheConfig.readCache();
    if (cached !== null) return { data: cached, error: null };
    return { data: null as unknown as TData, error: 'Offline — no cached data available' };
  };
}

// ─── Write wrapper ─────────────────────────────────────────────────────────────

export interface WriteCacheConfig<TResult> {
  entity: string;
  operation: syncQueue.SyncOperation;
  /**
   * Build an optimistic record from the input payload.
   * Must include all fields the UI expects (with sensible defaults for
   * server-generated fields like created_at).
   */
  buildOptimistic: (payload: Record<string, unknown>, userId: string) => TResult;
  /** Write the confirmed record (or optimistic record) to cache */
  writeCache: (record: TResult) => Promise<void>;
  /** Called after a successful online write to refresh related caches */
  postWrite?: (record: TResult) => Promise<void>;
  /**
   * For deletes / updates: the ID of the record being mutated.
   * For creates: leave undefined — the tempId is generated here.
   */
  recordId?: string;
  /** Temp IDs this entry depends on (FK deps for topological sort) */
  dependencies?: string[];
}

/**
 * Wraps a write service function with offline queueing.
 *
 * Online:  call service → on success update cache → return data
 * Offline: build optimistic record → save to cache → enqueue → return optimistic
 */
export function withOfflineWrite<TInput extends Record<string, unknown>, TResult>(
  serviceFn: (
    ...args: any[]
  ) => Promise<{ data: TResult | null; error: string | null }>,
  cacheConfig: WriteCacheConfig<TResult>,
): (input: TInput, ...extra: any[]) => Promise<{ data: TResult | null; error: string | null }> {
  return async (input: TInput, ...extra: any[]) => {
    if (getIsOnline()) {
      try {
        const result = await serviceFn(input, ...extra);
        if (!result.error && result.data) {
          await cacheConfig.writeCache(result.data);
          if (cacheConfig.postWrite) await cacheConfig.postWrite(result.data);
        }
        return result;
      } catch {
        // Fall through to offline path
      }
    }

    // Offline (or online call failed) — build optimistic record
    const userId = getUserId() ?? 'unknown';
    const tempId = Crypto.randomUUID();
    const now = new Date().toISOString();

    const optimistic = cacheConfig.buildOptimistic(
      {
        ...input,
        id: cacheConfig.recordId ?? tempId,
        doctor_id: userId,
        created_at: now,
        updated_at: now,
        _pendingSync: true,
      },
      userId,
    );

    await cacheConfig.writeCache(optimistic);

    await syncQueue.enqueue({
      entity: cacheConfig.entity,
      operation: cacheConfig.operation,
      recordId: cacheConfig.recordId ?? tempId,
      tempId: cacheConfig.operation === 'create' ? tempId : undefined,
      payload: { ...input, _pendingSync: undefined } as Record<string, unknown>,
      dependencies: cacheConfig.dependencies,
    });

    return { data: optimistic, error: null };
  };
}
