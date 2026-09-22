/**
 * attendanceService.offline.ts
 *
 * Drop-in replacements for all attendanceService functions.
 * Identical function signatures — screens only change the import path.
 */

import * as attendanceService from '@/services/attendanceService';
import type { Attendance, Patient } from '@/types';
import { getIsOnline, getUserId } from '@/lib/networkState';
import * as offlineCache from '@/lib/offlineCache';
import * as syncQueue from '@/lib/syncQueue';
import * as Crypto from 'expo-crypto';

const ENTITY = 'attendances';

function strip<T extends object>(record: T): T {
  const { _pendingSync, ...clean } = record as any;
  void _pendingSync;
  return clean as T;
}
function stripAll<T extends object>(records: T[]): T[] {
  return records.map(strip);
}

/** Back-fill patient.full_name from the patients cache for records that are missing it. */
async function enrichWithPatientName(records: Attendance[]): Promise<Attendance[]> {
  const patients = await offlineCache.getCollection<Patient>('patients');
  if (!patients || patients.length === 0) return records;
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  return records.map((a) => {
    if (a.patient?.full_name && a.patient.full_name !== 'Unknown Patient') return a;
    const p = patientMap.get(a.patient_id);
    if (!p) return a;
    return { ...a, patient: { full_name: p.full_name } };
  });
}

// ─── getAttendances ────────────────────────────────────────────────────────────

export async function getAttendances(
  date?: string,
  page = 0,
  pageSize = 20,
): Promise<{ data: Attendance[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await attendanceService.getAttendances(date, page, pageSize);
      if (!result.error && result.data) {
        if (!date && page === 0) {
          // Cache the first page of undated results as the primary collection
          await offlineCache.setCollection<Attendance>(ENTITY, result.data);
        }
      }
      return result;
    } catch {
      // Fall through
    }
  }

  // Offline path — filter and paginate in-memory
  const cached = await offlineCache.getCollection<Attendance>(ENTITY);
  if (cached === null) return { data: [], error: 'Offline — no cached data available' };

  let filtered = cached;
  if (date) {
    filtered = cached.filter((a) => a.attendance_date === date);
  }

  // Sort: newest first
  filtered = [...filtered].sort((a, b) => {
    const dateCmp = b.attendance_date.localeCompare(a.attendance_date);
    if (dateCmp !== 0) return dateCmp;
    return b.attendance_time.localeCompare(a.attendance_time);
  });

  const from = page * pageSize;
  const paginated = filtered.slice(from, from + pageSize);
  const enriched = await enrichWithPatientName(paginated);

  return { data: stripAll(enriched), error: null };
}

// ─── getAttendanceById ────────────────────────────────────────────────────────

export async function getAttendanceById(
  id: string,
): Promise<{ data: Attendance | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await attendanceService.getAttendanceById(id);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Attendance>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached =
    (await offlineCache.getRecord<Attendance>(ENTITY, id)) ??
    (await offlineCache.getCollection<Attendance>(ENTITY))?.find((a) => a.id === id) ??
    null;

  if (!cached) return { data: null, error: 'Offline — attendance not cached' };
  return { data: strip(cached), error: null };
}

// ─── createAttendance ─────────────────────────────────────────────────────────

export async function createAttendance(
  input: Omit<Attendance, 'id' | 'created_at' | 'updated_at' | 'doctor_id'>,
): Promise<{ data: Attendance | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await attendanceService.createAttendance(input);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Attendance>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const userId = getUserId() ?? 'unknown';
  const tempId = Crypto.randomUUID();
  const now = new Date().toISOString();

  let patientName = 'Unknown Patient';
  if (input.patient_id) {
    const p = await offlineCache.getRecord<Patient>('patients', input.patient_id);
    if (p) patientName = p.full_name;
  }

  const optimistic: Attendance = {
    id: tempId,
    doctor_id: userId,
    created_at: now,
    updated_at: now,
    patient: { full_name: patientName },
    ...input,
  };

  await offlineCache.setRecord<Attendance>(ENTITY, optimistic);

  // If patient_id looks like a temp UUID, mark it as a dependency
  const dependencies = input.patient_id?.startsWith('temp-') ? [input.patient_id] : [];

  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'create',
    recordId: tempId,
    tempId,
    payload: input as unknown as Record<string, unknown>,
    dependencies,
  });

  return { data: strip(optimistic), error: null };
}

// ─── updateAttendance ─────────────────────────────────────────────────────────

export async function updateAttendance(
  id: string,
  input: Partial<Omit<Attendance, 'id' | 'created_at' | 'updated_at' | 'doctor_id'>>,
): Promise<{ data: Attendance | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await attendanceService.updateAttendance(id, input);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Attendance>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const existing = await offlineCache.getRecord<Attendance>(ENTITY, id);
  if (!existing) return { data: null, error: 'Offline — attendance not cached' };

  const updated: Attendance = { ...existing, ...input, updated_at: new Date().toISOString() };
  await offlineCache.setRecord<Attendance>(ENTITY, updated);
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'update',
    recordId: id,
    payload: input as Record<string, unknown>,
  });

  return { data: strip(updated), error: null };
}

// ─── deleteAttendance ─────────────────────────────────────────────────────────

export async function deleteAttendance(
  id: string,
): Promise<{ error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await attendanceService.deleteAttendance(id);
      if (!result.error) {
        await offlineCache.removeRecord<Attendance>(ENTITY, id);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  await offlineCache.removeRecord<Attendance>(ENTITY, id);
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'delete',
    recordId: id,
    payload: {},
  });

  return { error: null };
}
