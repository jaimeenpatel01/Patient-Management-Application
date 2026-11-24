/**
 * appointmentService.offline.ts
 *
 * Drop-in replacements for appointmentService functions.
 * Identical function signatures — screens only change the import path.
 */

import * as appointmentService from '@/services/appointmentService';
import { computeOccurrenceDates } from '@/lib/recurrence';
import type { Appointment, AppointmentSeries, Patient } from '@/types';
import type { AppointmentFilters, CreateAppointmentSeriesInput } from '@/services/appointmentService';
import { getIsOnline, getUserId } from '@/lib/networkState';
import * as offlineCache from '@/lib/offlineCache';
import * as syncQueue from '@/lib/syncQueue';
import * as Crypto from 'expo-crypto';

const ENTITY = 'appointments';
const SERIES_ENTITY = 'appointment_series';

function strip<T extends object>(record: T): T {
  const { _pendingSync, ...clean } = record as any;
  void _pendingSync;
  return clean as T;
}
function stripAll<T extends object>(records: T[]): T[] {
  return records.map(strip);
}

/** Back-fill patient.full_name from the patients cache for records that are missing it. */
async function enrichWithPatientName(records: Appointment[]): Promise<Appointment[]> {
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

// ─── getAppointments ───────────────────────────────────────────────────────────

export async function getAppointments(
  filters: AppointmentFilters = {},
  page = 0,
  pageSize = 20,
): Promise<{ data: Appointment[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await appointmentService.getAppointments(filters, page, pageSize);
      if (!result.error && result.data) {
        if (Object.keys(filters).length === 0 && page === 0) {
          await offlineCache.setCollection<Appointment>(ENTITY, result.data);
        }
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached = await offlineCache.getCollection<Appointment>(ENTITY);
  if (cached === null) return { data: [], error: 'Offline — no cached data available' };

  let filtered = cached;
  if (filters.date) filtered = filtered.filter((a) => a.appointment_date === filters.date);
  if (filters.patientId) filtered = filtered.filter((a) => a.patient_id === filters.patientId);
  if (filters.status) filtered = filtered.filter((a) => a.status === filters.status);

  filtered = [...filtered].sort((a, b) => {
    const dateCmp = a.appointment_date.localeCompare(b.appointment_date);
    if (dateCmp !== 0) return dateCmp;
    return a.appointment_time.localeCompare(b.appointment_time);
  });

  const from = page * pageSize;
  const paginated = filtered.slice(from, from + pageSize);
  const enriched = await enrichWithPatientName(paginated);

  return { data: stripAll(enriched), error: null };
}

// ─── getAppointmentById ────────────────────────────────────────────────────────

export async function getAppointmentById(
  id: string,
): Promise<{ data: Appointment | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await appointmentService.getAppointmentById(id);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Appointment>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached =
    (await offlineCache.getRecord<Appointment>(ENTITY, id)) ??
    (await offlineCache.getCollection<Appointment>(ENTITY))?.find((a) => a.id === id) ??
    null;

  if (!cached) return { data: null, error: 'Offline — appointment not cached' };
  return { data: strip(cached), error: null };
}

// ─── createAppointmentSeries ───────────────────────────────────────────────────

export async function createAppointmentSeries(
  input: CreateAppointmentSeriesInput,
): Promise<{ data: { series: AppointmentSeries; appointments: Appointment[] } | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await appointmentService.createAppointmentSeries(input);
      if (!result.error && result.data) {
        for (const appt of result.data.appointments) {
          await offlineCache.setRecord<Appointment>(ENTITY, appt);
        }
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const userId = getUserId() ?? 'unknown';
  const now = new Date().toISOString();
  const seriesTempId = Crypto.randomUUID();

  const optimisticSeries: AppointmentSeries = {
    id: seriesTempId,
    doctor_id: userId,
    status: 'active',
    created_at: now,
    updated_at: now,
    ...input,
  };

  await syncQueue.enqueue({
    entity: SERIES_ENTITY,
    operation: 'create',
    recordId: seriesTempId,
    tempId: seriesTempId,
    payload: input as unknown as Record<string, unknown>,
    dependencies: [],
  });

  const dates = computeOccurrenceDates({
    start_date: input.start_date,
    frequency: input.frequency,
    days_of_week: input.days_of_week,
    end_type: input.end_type,
    end_date: input.end_date,
    occurrences_count: input.occurrences_count,
  });

  let patientName = 'Unknown Patient';
  if (input.patient_id) {
    const p = await offlineCache.getRecord<Patient>('patients', input.patient_id);
    if (p) patientName = p.full_name;
  }

  const optimisticAppointments: Appointment[] = [];
  for (const date of dates) {
    const tempId = Crypto.randomUUID();
    const appointmentInput = {
      patient_id: input.patient_id,
      series_id: seriesTempId,
      appointment_date: date,
      appointment_time: input.start_time,
      duration_minutes: input.duration_minutes,
      notes: input.notes,
    };

    const optimistic: Appointment = {
      id: tempId,
      doctor_id: userId,
      status: 'scheduled',
      created_at: now,
      updated_at: now,
      patient: { full_name: patientName },
      series: { frequency: input.frequency },
      ...appointmentInput,
    };

    await offlineCache.setRecord<Appointment>(ENTITY, optimistic);
    optimisticAppointments.push(optimistic);

    const dependencies = input.patient_id?.startsWith('temp-') ? [seriesTempId, input.patient_id] : [seriesTempId];
    await syncQueue.enqueue({
      entity: ENTITY,
      operation: 'create',
      recordId: tempId,
      tempId,
      payload: appointmentInput as unknown as Record<string, unknown>,
      dependencies,
    });
  }

  return {
    data: { series: optimisticSeries, appointments: stripAll(optimisticAppointments) },
    error: null,
  };
}

// ─── updateAppointment ─────────────────────────────────────────────────────────

export async function updateAppointment(
  id: string,
  input: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'doctor_id' | 'series_id'>>,
): Promise<{ data: Appointment | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await appointmentService.updateAppointment(id, input);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Appointment>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const existing = await offlineCache.getRecord<Appointment>(ENTITY, id);
  if (!existing) return { data: null, error: 'Offline — appointment not cached' };

  const updated: Appointment = { ...existing, ...input, updated_at: new Date().toISOString() };
  await offlineCache.setRecord<Appointment>(ENTITY, updated);
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'update',
    recordId: id,
    payload: input as Record<string, unknown>,
  });

  return { data: strip(updated), error: null };
}

// ─── deleteAppointment ──────────────────────────────────────────────────────────

export async function deleteAppointment(id: string): Promise<{ error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await appointmentService.deleteAppointment(id);
      if (!result.error) {
        await offlineCache.removeRecord<Appointment>(ENTITY, id);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  await offlineCache.removeRecord<Appointment>(ENTITY, id);
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'delete',
    recordId: id,
    payload: {},
  });

  return { error: null };
}

// ─── cancelAppointmentSeries ────────────────────────────────────────────────────

export async function cancelAppointmentSeries(seriesId: string): Promise<{ error: string | null }> {
  const isDeletable = (a: Appointment) =>
    a.series_id === seriesId && appointmentService.SERIES_CANCEL_DELETABLE_STATUSES.includes(a.status);

  if (getIsOnline()) {
    try {
      const result = await appointmentService.cancelAppointmentSeries(seriesId);
      if (!result.error) {
        const cached = await offlineCache.getCollection<Appointment>(ENTITY);
        if (cached) await offlineCache.setCollection<Appointment>(ENTITY, cached.filter((a) => !isDeletable(a)));
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached = await offlineCache.getCollection<Appointment>(ENTITY);
  if (cached) {
    const removed = cached.filter(isDeletable);
    await offlineCache.setCollection<Appointment>(ENTITY, cached.filter((a) => !isDeletable(a)));

    for (const a of removed) {
      await syncQueue.enqueue({
        entity: ENTITY,
        operation: 'delete',
        recordId: a.id,
        payload: {},
      });
    }
  }

  // Offline the cache may not hold every completed visit, so never delete the
  // series here (appointments.series_id cascades); marking it cancelled is safe.
  await syncQueue.enqueue({
    entity: SERIES_ENTITY,
    operation: 'update',
    recordId: seriesId,
    payload: { status: 'cancelled' },
  });

  return { error: null };
}

// ─── topUpSeriesIfNeeded ────────────────────────────────────────────────────────

export async function topUpSeriesIfNeeded(): Promise<{ error: string | null }> {
  if (!getIsOnline()) return { error: null };
  try {
    return await appointmentService.topUpSeriesIfNeeded();
  } catch {
    return { error: null };
  }
}
