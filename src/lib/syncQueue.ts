/**
 * syncQueue.ts
 *
 * Persistent mutation queue for offline writes.
 * Stored in AsyncStorage at @sync:queue as a JSON array of QueueEntry objects.
 *
 * Entry lifecycle:
 *   enqueue() → stored in queue
 *   processQueue() (syncEngine) calls dequeue() on success
 *   retryCount incremented on failure, dropped after MAX_RETRIES
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const QUEUE_KEY = '@sync:queue';
const MAX_RETRIES = 3;

export type SyncOperation = 'create' | 'update' | 'delete';

export interface QueueEntry {
  /** Unique ID for this queue entry */
  id: string;
  /** ISO timestamp — used for ordering */
  timestamp: string;
  /** DB table / domain (e.g. 'patients', 'attendances') */
  entity: string;
  operation: SyncOperation;
  /** Real or temp record ID */
  recordId: string;
  /** Temp UUID used for optimistic records (create only) */
  tempId?: string;
  /** Full payload to send to the service */
  payload: Record<string, unknown>;
  /**
   * Temp IDs this entry depends on — sync engine will resolve them to
   * real IDs before calling the service.
   * Example: attendance create depends on temp patient ID.
   */
  dependencies?: string[];
  retryCount: number;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function readQueue(): Promise<QueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueueEntry[];
  } catch {
    return [];
  }
}

async function writeQueue(entries: QueueEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  } catch {
    // Silently fail — the in-memory attempt is best-effort
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function enqueue(entry: Omit<QueueEntry, 'id' | 'timestamp' | 'retryCount'>): Promise<QueueEntry> {
  const queue = await readQueue();
  const newEntry: QueueEntry = {
    ...entry,
    id: Crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };
  queue.push(newEntry);
  await writeQueue(queue);
  return newEntry;
}

export async function dequeue(entryId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((e) => e.id !== entryId));
}

export async function getAll(): Promise<QueueEntry[]> {
  return readQueue();
}

export async function getCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/** Increment retryCount; remove the entry if it exceeds MAX_RETRIES. */
export async function incrementRetry(entryId: string): Promise<void> {
  const queue = await readQueue();
  const updated = queue
    .map((e) => (e.id === entryId ? { ...e, retryCount: e.retryCount + 1 } : e))
    .filter((e) => e.retryCount <= MAX_RETRIES);
  await writeQueue(updated);
}

/** Update temp IDs in queue entries after a successful sync maps tempId → realId. */
export async function replaceTempId(tempId: string, realId: string): Promise<void> {
  const queue = await readQueue();
  const updated = queue.map((e) => {
    // Replace in payload values
    const newPayload = Object.fromEntries(
      Object.entries(e.payload).map(([k, v]) => [k, v === tempId ? realId : v]),
    );
    // Replace in dependencies list
    const newDeps = e.dependencies?.map((d) => (d === tempId ? realId : d));
    return { ...e, payload: newPayload, dependencies: newDeps };
  });
  await writeQueue(updated);
}

export async function clear(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // Silently fail
  }
}

export { MAX_RETRIES };
