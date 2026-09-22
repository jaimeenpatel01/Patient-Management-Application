/**
 * offlineCache.ts
 *
 * AsyncStorage-backed cache layer for offline data.
 *
 * Key scheme:
 *   @cache:{entity}               → collection (T[])
 *   @cache:{entity}:{id}          → single record (T)
 *   @cache:{entity}:by:{fk}:{val} → relation list (T[])
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Key builders ──────────────────────────────────────────────────────────────

const collectionKey = (entity: string) => `@cache:${entity}`;
const recordKey = (entity: string, id: string) => `@cache:${entity}:${id}`;
const relationKey = (entity: string, fk: string, fkValue: string) =>
  `@cache:${entity}:by:${fk}:${fkValue}`;

// ─── Collection helpers ────────────────────────────────────────────────────────

export async function getCollection<T>(entity: string): Promise<T[] | null> {
  try {
    const raw = await AsyncStorage.getItem(collectionKey(entity));
    if (!raw) return null;
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
}

export async function setCollection<T>(entity: string, data: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(collectionKey(entity), JSON.stringify(data));
  } catch {
    // Silently fail — cache writes are best-effort
  }
}

// ─── Single-record helpers ─────────────────────────────────────────────────────

export async function getRecord<T>(entity: string, id: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(recordKey(entity, id));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Save a single record AND upsert it into the collection cache so both
 * views stay consistent without a full re-fetch.
 */
export async function setRecord<T extends { id: string }>(
  entity: string,
  record: T,
): Promise<void> {
  try {
    await AsyncStorage.setItem(recordKey(entity, record.id), JSON.stringify(record));

    // Upsert into the collection cache
    const existing = await getCollection<T>(entity);
    if (existing !== null) {
      const idx = existing.findIndex((r) => r.id === record.id);
      if (idx >= 0) {
        existing[idx] = record;
      } else {
        existing.unshift(record);
      }
      await setCollection(entity, existing);
    }
  } catch {
    // Silently fail
  }
}

// ─── Relation helpers ──────────────────────────────────────────────────────────

export async function getRelation<T>(
  entity: string,
  fk: string,
  fkValue: string,
): Promise<T[] | null> {
  try {
    const raw = await AsyncStorage.getItem(relationKey(entity, fk, fkValue));
    if (!raw) return null;
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
}

export async function setRelation<T>(
  entity: string,
  fk: string,
  fkValue: string,
  data: T[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(relationKey(entity, fk, fkValue), JSON.stringify(data));
  } catch {
    // Silently fail
  }
}

// ─── Remove a record ──────────────────────────────────────────────────────────

export async function removeRecord<T extends { id: string }>(
  entity: string,
  id: string,
): Promise<void> {
  try {
    // Remove the single-record entry
    await AsyncStorage.removeItem(recordKey(entity, id));

    // Also remove from the collection cache
    const existing = await getCollection<T>(entity);
    if (existing !== null) {
      const filtered = existing.filter((r) => r.id !== id);
      await setCollection(entity, filtered);
    }
  } catch {
    // Silently fail
  }
}

// ─── Upsert into a relation list ──────────────────────────────────────────────

export async function upsertIntoRelation<T extends { id: string }>(
  entity: string,
  fk: string,
  fkValue: string,
  record: T,
): Promise<void> {
  try {
    const existing = await getRelation<T>(entity, fk, fkValue);
    if (existing !== null) {
      const idx = existing.findIndex((r) => r.id === record.id);
      if (idx >= 0) {
        existing[idx] = record;
      } else {
        existing.unshift(record);
      }
      await setRelation(entity, fk, fkValue, existing);
    }
  } catch {
    // Silently fail
  }
}

// ─── Clear everything on logout ────────────────────────────────────────────────

export async function clearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('@cache:'));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Silently fail
  }
}
