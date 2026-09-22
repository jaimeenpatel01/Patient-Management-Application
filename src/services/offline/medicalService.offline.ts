/**
 * medicalService.offline.ts
 *
 * Drop-in replacements for all medicalService functions.
 * Identical function signatures — screens only change the import path.
 */

import * as medicalService from '@/services/medicalService';
import type {
  Consultation,
  Diagnosis,
  Treatment,
  ExercisePlan,
} from '@/types';
import { getIsOnline, getUserId } from '@/lib/networkState';
import * as offlineCache from '@/lib/offlineCache';
import * as syncQueue from '@/lib/syncQueue';
import * as Crypto from 'expo-crypto';

function strip<T extends object>(record: T): T {
  const { _pendingSync, ...clean } = record as any;
  void _pendingSync;
  return clean as T;
}
function stripAll<T extends object>(records: T[]): T[] {
  return records.map(strip);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSULTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CONSULTATIONS = 'consultations';

export async function getConsultations(
  patientId: string,
): Promise<{ data: Consultation[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.getConsultations(patientId);
      if (!result.error && result.data) {
        await offlineCache.setRelation<Consultation>(
          CONSULTATIONS,
          'patient_id',
          patientId,
          result.data,
        );
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached = await offlineCache.getRelation<Consultation>(
    CONSULTATIONS,
    'patient_id',
    patientId,
  );
  if (cached !== null) return { data: stripAll(cached), error: null };
  return { data: [], error: null };
}

export async function createConsultation(
  input: Omit<Consultation, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>,
): Promise<{ data: Consultation | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.createConsultation(input);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Consultation>(CONSULTATIONS, result.data);
        await offlineCache.upsertIntoRelation<Consultation>(
          CONSULTATIONS,
          'patient_id',
          result.data.patient_id,
          result.data,
        );
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const userId = getUserId() ?? 'unknown';
  const tempId = Crypto.randomUUID();
  const now = new Date().toISOString();

  const optimistic: Consultation = {
    id: tempId,
    doctor_id: userId,
    created_at: now,
    updated_at: now,
    ...input,
  };

  await offlineCache.setRecord<Consultation>(CONSULTATIONS, optimistic);
  await offlineCache.upsertIntoRelation<Consultation>(
    CONSULTATIONS,
    'patient_id',
    optimistic.patient_id,
    optimistic,
  );

  const dependencies = input.patient_id?.startsWith('temp-') ? [input.patient_id] : [];
  if (input.attendance_id?.startsWith('temp-')) dependencies.push(input.attendance_id);

  await syncQueue.enqueue({
    entity: CONSULTATIONS,
    operation: 'create',
    recordId: tempId,
    tempId,
    payload: input as unknown as Record<string, unknown>,
    dependencies,
  });

  return { data: strip(optimistic), error: null };
}

export async function updateConsultation(
  id: string,
  input: Partial<Omit<Consultation, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>>,
): Promise<{ data: Consultation | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.updateConsultation(id, input);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Consultation>(CONSULTATIONS, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const existing = await offlineCache.getRecord<Consultation>(CONSULTATIONS, id);
  if (!existing) return { data: null, error: 'Offline — consultation not cached' };

  const updated: Consultation = { ...existing, ...input, updated_at: new Date().toISOString() };
  await offlineCache.setRecord<Consultation>(CONSULTATIONS, updated);
  await syncQueue.enqueue({
    entity: CONSULTATIONS,
    operation: 'update',
    recordId: id,
    payload: input as Record<string, unknown>,
  });

  return { data: strip(updated), error: null };
}

export async function deleteConsultation(
  id: string,
): Promise<{ error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.deleteConsultation(id);
      if (!result.error) {
        await offlineCache.removeRecord<Consultation>(CONSULTATIONS, id);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  await offlineCache.removeRecord<Consultation>(CONSULTATIONS, id);
  await syncQueue.enqueue({
    entity: CONSULTATIONS,
    operation: 'delete',
    recordId: id,
    payload: {},
  });

  return { error: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSES
// ═══════════════════════════════════════════════════════════════════════════════

const DIAGNOSES = 'diagnoses';

export async function getDiagnoses(
  consultationId: string,
): Promise<{ data: Diagnosis[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.getDiagnoses(consultationId);
      if (!result.error && result.data) {
        await offlineCache.setRelation<Diagnosis>(
          DIAGNOSES,
          'consultation_id',
          consultationId,
          result.data,
        );
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached = await offlineCache.getRelation<Diagnosis>(
    DIAGNOSES,
    'consultation_id',
    consultationId,
  );
  return { data: cached ? stripAll(cached) : [], error: null };
}

export async function createDiagnosis(
  input: Omit<Diagnosis, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>,
): Promise<{ data: Diagnosis | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.createDiagnosis(input);
      if (!result.error && result.data) {
        await offlineCache.upsertIntoRelation<Diagnosis>(
          DIAGNOSES,
          'consultation_id',
          result.data.consultation_id,
          result.data,
        );
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const userId = getUserId() ?? 'unknown';
  const tempId = Crypto.randomUUID();
  const now = new Date().toISOString();

  const optimistic: Diagnosis = {
    id: tempId,
    doctor_id: userId,
    created_at: now,
    updated_at: now,
    ...input,
  };

  await offlineCache.upsertIntoRelation<Diagnosis>(
    DIAGNOSES,
    'consultation_id',
    optimistic.consultation_id,
    optimistic,
  );

  const dependencies = input.consultation_id?.startsWith('temp-')
    ? [input.consultation_id]
    : [];

  await syncQueue.enqueue({
    entity: DIAGNOSES,
    operation: 'create',
    recordId: tempId,
    tempId,
    payload: input as unknown as Record<string, unknown>,
    dependencies,
  });

  return { data: strip(optimistic), error: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREATMENTS
// ═══════════════════════════════════════════════════════════════════════════════

const TREATMENTS = 'treatments';

export async function getTreatments(
  consultationId: string,
): Promise<{ data: Treatment[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.getTreatments(consultationId);
      if (!result.error && result.data) {
        await offlineCache.setRelation<Treatment>(
          TREATMENTS,
          'consultation_id',
          consultationId,
          result.data,
        );
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached = await offlineCache.getRelation<Treatment>(
    TREATMENTS,
    'consultation_id',
    consultationId,
  );
  return { data: cached ? stripAll(cached) : [], error: null };
}

export async function createTreatment(
  input: Omit<Treatment, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>,
): Promise<{ data: Treatment | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.createTreatment(input);
      if (!result.error && result.data) {
        await offlineCache.upsertIntoRelation<Treatment>(
          TREATMENTS,
          'consultation_id',
          result.data.consultation_id,
          result.data,
        );
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const userId = getUserId() ?? 'unknown';
  const tempId = Crypto.randomUUID();
  const now = new Date().toISOString();

  const optimistic: Treatment = {
    id: tempId,
    doctor_id: userId,
    created_at: now,
    updated_at: now,
    ...input,
  };

  await offlineCache.upsertIntoRelation<Treatment>(
    TREATMENTS,
    'consultation_id',
    optimistic.consultation_id,
    optimistic,
  );

  const dependencies = input.consultation_id?.startsWith('temp-')
    ? [input.consultation_id]
    : [];

  await syncQueue.enqueue({
    entity: TREATMENTS,
    operation: 'create',
    recordId: tempId,
    tempId,
    payload: input as unknown as Record<string, unknown>,
    dependencies,
  });

  return { data: strip(optimistic), error: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISE PLANS
// ═══════════════════════════════════════════════════════════════════════════════

const EXERCISE_PLANS = 'exercise_plans';

export async function getExercisePlans(
  consultationId: string,
): Promise<{ data: ExercisePlan[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.getExercisePlans(consultationId);
      if (!result.error && result.data) {
        await offlineCache.setRelation<ExercisePlan>(
          EXERCISE_PLANS,
          'consultation_id',
          consultationId,
          result.data,
        );
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached = await offlineCache.getRelation<ExercisePlan>(
    EXERCISE_PLANS,
    'consultation_id',
    consultationId,
  );
  return { data: cached ? stripAll(cached) : [], error: null };
}

export async function createExercisePlan(
  input: Omit<ExercisePlan, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>,
): Promise<{ data: ExercisePlan | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await medicalService.createExercisePlan(input);
      if (!result.error && result.data && result.data.consultation_id) {
        await offlineCache.upsertIntoRelation<ExercisePlan>(
          EXERCISE_PLANS,
          'consultation_id',
          result.data.consultation_id,
          result.data,
        );
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const userId = getUserId() ?? 'unknown';
  const tempId = Crypto.randomUUID();
  const now = new Date().toISOString();

  const optimistic: ExercisePlan = {
    id: tempId,
    doctor_id: userId,
    created_at: now,
    updated_at: now,
    ...input,
  };

  if (optimistic.consultation_id) {
    await offlineCache.upsertIntoRelation<ExercisePlan>(
      EXERCISE_PLANS,
      'consultation_id',
      optimistic.consultation_id,
      optimistic,
    );
  }

  const dependencies =
    input.consultation_id?.startsWith('temp-') ? [input.consultation_id] : [];

  await syncQueue.enqueue({
    entity: EXERCISE_PLANS,
    operation: 'create',
    recordId: tempId,
    tempId,
    payload: input as unknown as Record<string, unknown>,
    dependencies,
  });

  return { data: strip(optimistic), error: null };
}
