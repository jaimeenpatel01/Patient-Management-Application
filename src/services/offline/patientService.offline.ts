/**
 * patientService.offline.ts
 *
 * Drop-in replacements for all patientService functions.
 * Identical function signatures — screens only change the import path.
 */

import * as patientService from '@/services/patientService';
import type { CreatePatientInput, UpdatePatientInput } from '@/services/patientService';
import type { Patient } from '@/types';
import { getIsOnline, getUserId } from '@/lib/networkState';
import * as offlineCache from '@/lib/offlineCache';
import * as syncQueue from '@/lib/syncQueue';
import * as Crypto from 'expo-crypto';

const ENTITY = 'patients';

// ─── Strip internal marker before returning to the UI ─────────────────────────
function strip<T extends object>(record: T): T {
  const { _pendingSync, ...clean } = record as any;
  void _pendingSync;
  return clean as T;
}
function stripAll<T extends object>(records: T[]): T[] {
  return records.map(strip);
}

// ─── getPatients ──────────────────────────────────────────────────────────────

export async function getPatients(
  status: 'active' | 'inactive' | 'all' = 'active',
): Promise<{ data: Patient[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await patientService.getPatients(status);
      if (!result.error && result.data.length >= 0) {
        // Cache the full 'all' set; we'll filter in-memory when offline
        if (status === 'all') {
          await offlineCache.setCollection<Patient>(ENTITY, result.data);
        } else {
          // Merge into full cache to keep it fresh
          const all = await offlineCache.getCollection<Patient>(ENTITY);
          if (all !== null) {
            const merged = mergeInto(all, result.data);
            await offlineCache.setCollection<Patient>(ENTITY, merged);
          }
        }
      }
      return result;
    } catch {
      // Fall through to cache
    }
  }

  // Offline path
  const cached = await offlineCache.getCollection<Patient>(ENTITY);
  if (cached === null) return { data: [], error: 'Offline — no cached data available' };

  const filtered =
    status === 'all'
      ? cached
      : cached.filter((p) => (status === 'active' ? p.is_active : !p.is_active));

  return { data: stripAll(filtered), error: null };
}

function mergeInto(existing: Patient[], incoming: Patient[]): Patient[] {
  const map = new Map(existing.map((p) => [p.id, p]));
  incoming.forEach((p) => map.set(p.id, p));
  return [...map.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
}

// ─── searchPatients ───────────────────────────────────────────────────────────

export async function searchPatients(
  query: string,
): Promise<{ data: Patient[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      return await patientService.searchPatients(query);
    } catch {
      // Fall through
    }
  }

  const cached = await offlineCache.getCollection<Patient>(ENTITY);
  if (cached === null) return { data: [], error: null };

  const q = query.toLowerCase();
  const results = cached
    .filter((p) => p.is_active)
    .filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.phone?.toLowerCase().includes(q) ?? false),
    );

  return { data: stripAll(results), error: null };
}

// ─── getPatientById ───────────────────────────────────────────────────────────

export async function getPatientById(
  id: string,
): Promise<{ data: Patient | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await patientService.getPatientById(id);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Patient>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached =
    (await offlineCache.getRecord<Patient>(ENTITY, id)) ??
    (await offlineCache.getCollection<Patient>(ENTITY))?.find((p) => p.id === id) ??
    null;

  if (!cached) return { data: null, error: 'Offline — patient not cached' };
  return { data: strip(cached), error: null };
}

// ─── createPatient ────────────────────────────────────────────────────────────

export async function createPatient(
  input: CreatePatientInput,
): Promise<{ data: Patient | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await patientService.createPatient(input);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Patient>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through to offline path
    }
  }

  const userId = getUserId() ?? 'unknown';
  const tempId = Crypto.randomUUID();
  const now = new Date().toISOString();

  const optimistic: Patient = {
    id: tempId,
    doctor_id: userId,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...input,
  };

  await offlineCache.setRecord<Patient>(ENTITY, optimistic);
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'create',
    recordId: tempId,
    tempId,
    payload: input as unknown as Record<string, unknown>,
    dependencies: [],
  });

  return { data: strip(optimistic), error: null };
}

// ─── updatePatient ────────────────────────────────────────────────────────────

export async function updatePatient(
  id: string,
  input: UpdatePatientInput,
): Promise<{ data: Patient | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await patientService.updatePatient(id, input);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Patient>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  // Offline: update the cached record optimistically
  const existing = await offlineCache.getRecord<Patient>(ENTITY, id);
  if (!existing) return { data: null, error: 'Offline — patient not cached' };

  const updated: Patient = { ...existing, ...input, updated_at: new Date().toISOString() };
  await offlineCache.setRecord<Patient>(ENTITY, updated);
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'update',
    recordId: id,
    payload: input as unknown as Record<string, unknown>,
  });

  return { data: strip(updated), error: null };
}

// ─── deletePatient ────────────────────────────────────────────────────────────

export async function deletePatient(
  id: string,
): Promise<{ error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await patientService.deletePatient(id);
      if (!result.error) {
        // Reflect soft-delete in cache
        const cached = await offlineCache.getRecord<Patient>(ENTITY, id);
        if (cached) {
          await offlineCache.setRecord<Patient>(ENTITY, { ...cached, is_active: false });
        }
      }
      return result;
    } catch {
      // Fall through
    }
  }

  // Offline: soft-delete in cache
  const existing = await offlineCache.getRecord<Patient>(ENTITY, id);
  if (existing) {
    await offlineCache.setRecord<Patient>(ENTITY, { ...existing, is_active: false });
  }
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'delete',
    recordId: id,
    payload: {},
  });

  return { error: null };
}

export type { CreatePatientInput, UpdatePatientInput };
