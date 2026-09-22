/**
 * syncEngine.ts
 *
 * Processes the offline mutation queue when connectivity is restored.
 *
 * Algorithm:
 * 1. Read all queue entries, sort by timestamp (oldest first)
 * 2. Resolve temp IDs in payloads using a live idMapping
 * 3. Call the appropriate original Supabase service function
 * 4. On success: map tempId → realId, update cache, dequeue entry
 * 5. On failure: increment retryCount (entry auto-drops after MAX_RETRIES)
 * 6. After queue is drained: re-fetch collections to ensure cache freshness
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as syncQueue from './syncQueue';
import * as offlineCache from './offlineCache';

// Original services (not the offline wrappers — we write directly to Supabase here)
import {
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
} from '@/services/patientService';
import {
  getAttendances,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from '@/services/attendanceService';
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
} from '@/services/paymentService';
import {
  getConsultations,
  createConsultation,
  updateConsultation,
  deleteConsultation,
  getDiagnoses,
  createDiagnosis,
  getTreatments,
  createTreatment,
  getExercisePlans,
  createExercisePlan,
} from '@/services/medicalService';

export interface SyncResult {
  synced: number;
  failed: number;
}

/** Strip the _pendingSync marker before sending to the server. */
function cleanPayload(payload: Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _pendingSync, ...clean } = payload;
  return clean;
}

/** Replace all temp IDs in a payload with their real equivalents. */
function resolvePayload(
  payload: Record<string, unknown>,
  idMapping: Record<string, string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([k, v]) => [
      k,
      typeof v === 'string' && idMapping[v] ? idMapping[v] : v,
    ]),
  );
}

// ─── Entity-level sync dispatchers ────────────────────────────────────────────

async function syncEntry(
  entry: syncQueue.QueueEntry,
  idMapping: Record<string, string>,
): Promise<{ realId?: string; error?: string }> {
  const payload = cleanPayload(resolvePayload(entry.payload, idMapping)) as any;

  switch (entry.entity) {
    // ── Patients ──────────────────────────────────────────────────────────────
    case 'patients': {
      if (entry.operation === 'create') {
        const { data, error } = await createPatient(payload);
        if (error || !data) return { error: error ?? 'Unknown error' };
        return { realId: data.id };
      }
      if (entry.operation === 'update') {
        const id = idMapping[entry.recordId] ?? entry.recordId;
        const { error } = await updatePatient(id, payload);
        if (error) return { error };
        return {};
      }
      if (entry.operation === 'delete') {
        const id = idMapping[entry.recordId] ?? entry.recordId;
        const { error } = await deletePatient(id);
        if (error) return { error };
        return {};
      }
      break;
    }

    // ── Attendances ───────────────────────────────────────────────────────────
    case 'attendances': {
      if (entry.operation === 'create') {
        const { data, error } = await createAttendance(payload);
        if (error || !data) return { error: error ?? 'Unknown error' };
        return { realId: data.id };
      }
      if (entry.operation === 'update') {
        const id = idMapping[entry.recordId] ?? entry.recordId;
        const { error } = await updateAttendance(id, payload);
        if (error) return { error };
        return {};
      }
      if (entry.operation === 'delete') {
        const id = idMapping[entry.recordId] ?? entry.recordId;
        const { error } = await deleteAttendance(id);
        if (error) return { error };
        return {};
      }
      break;
    }

    // ── Payments ──────────────────────────────────────────────────────────────
    case 'payments': {
      if (entry.operation === 'create') {
        const { data, error } = await createPayment(payload);
        if (error || !data) return { error: error ?? 'Unknown error' };
        return { realId: data.id };
      }
      if (entry.operation === 'update') {
        const id = idMapping[entry.recordId] ?? entry.recordId;
        const { error } = await updatePayment(id, payload);
        if (error) return { error };
        return {};
      }
      if (entry.operation === 'delete') {
        const id = idMapping[entry.recordId] ?? entry.recordId;
        const { error } = await deletePayment(id);
        if (error) return { error };
        return {};
      }
      break;
    }

    // ── Consultations ─────────────────────────────────────────────────────────
    case 'consultations': {
      if (entry.operation === 'create') {
        const { data, error } = await createConsultation(payload);
        if (error || !data) return { error: error ?? 'Unknown error' };
        return { realId: data.id };
      }
      if (entry.operation === 'update') {
        const id = idMapping[entry.recordId] ?? entry.recordId;
        const { error } = await updateConsultation(id, payload);
        if (error) return { error };
        return {};
      }
      if (entry.operation === 'delete') {
        const id = idMapping[entry.recordId] ?? entry.recordId;
        const { error } = await deleteConsultation(id);
        if (error) return { error };
        return {};
      }
      break;
    }

    // ── Diagnoses ─────────────────────────────────────────────────────────────
    case 'diagnoses': {
      if (entry.operation === 'create') {
        const { data, error } = await createDiagnosis(payload);
        if (error || !data) return { error: error ?? 'Unknown error' };
        return { realId: data.id };
      }
      break;
    }

    // ── Treatments ────────────────────────────────────────────────────────────
    case 'treatments': {
      if (entry.operation === 'create') {
        const { data, error } = await createTreatment(payload);
        if (error || !data) return { error: error ?? 'Unknown error' };
        return { realId: data.id };
      }
      break;
    }

    // ── Exercise Plans ────────────────────────────────────────────────────────
    case 'exercise_plans': {
      if (entry.operation === 'create') {
        const { data, error } = await createExercisePlan(payload);
        if (error || !data) return { error: error ?? 'Unknown error' };
        return { realId: data.id };
      }
      break;
    }
  }

  return { error: `Unhandled entity/operation: ${entry.entity}/${entry.operation}` };
}

// ─── Cache refresh after sync ──────────────────────────────────────────────────

async function refreshCollectionCaches(): Promise<void> {
  try {
    const [patientsRes, attendancesRes, paymentsRes] = await Promise.allSettled([
      getPatients('all'),
      getAttendances(undefined, 0, 100),
      getPayments(0, 100),
    ]);

    if (patientsRes.status === 'fulfilled' && patientsRes.value.data) {
      await offlineCache.setCollection('patients', patientsRes.value.data);
    }
    if (attendancesRes.status === 'fulfilled' && attendancesRes.value.data) {
      await offlineCache.setCollection('attendances', attendancesRes.value.data);
    }
    if (paymentsRes.status === 'fulfilled' && paymentsRes.value.data) {
      await offlineCache.setCollection('payments', paymentsRes.value.data);
    }
  } catch {
    // Non-critical — cache will be refreshed on next read
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function processQueue(): Promise<SyncResult> {
  const entries = await syncQueue.getAll();

  // Sort oldest-first to respect creation order
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // idMapping: tempId → realId, built up as we process creates
  const idMapping: Record<string, string> = {};

  let synced = 0;
  let failed = 0;

  for (const entry of sorted) {
    try {
      const result = await syncEntry(entry, idMapping);

      if (result.error) {
        await syncQueue.incrementRetry(entry.id);
        failed++;
        continue;
      }

      // For creates: record the tempId → realId mapping so subsequent entries
      // referencing this temp ID get the real ID substituted in.
      if (entry.operation === 'create' && entry.tempId && result.realId) {
        idMapping[entry.tempId] = result.realId;

        // Propagate the mapping into the rest of the queue so entries already
        // stored in AsyncStorage also get their references updated.
        await syncQueue.replaceTempId(entry.tempId, result.realId);

        // Replace the temp-ID record in cache with the real ID record:
        // Remove temp-ID entry (we can't call removeRecord because we don't have
        // the typed record, but the cache upsert on next read will overwrite it).
        await AsyncStorage.removeItem(`@cache:${entry.entity}:${entry.tempId}`).catch(() => {});
      }

      await syncQueue.dequeue(entry.id);
      synced++;
    } catch {
      await syncQueue.incrementRetry(entry.id);
      failed++;
    }
  }

  // Refresh collection caches from the server after syncing
  if (synced > 0) {
    await refreshCollectionCaches();
  }

  return { synced, failed };
}


