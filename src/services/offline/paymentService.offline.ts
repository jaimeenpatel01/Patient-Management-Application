/**
 * paymentService.offline.ts
 *
 * Drop-in replacements for all paymentService functions.
 * Identical function signatures — screens only change the import path.
 */

import * as paymentService from '@/services/paymentService';
import type { PaymentWithPatient, RevenueStats, CreatePaymentInput } from '@/services/paymentService';
import type { Payment, PaymentStatus, Patient } from '@/types';
import { getIsOnline, getUserId } from '@/lib/networkState';
import * as offlineCache from '@/lib/offlineCache';
import * as syncQueue from '@/lib/syncQueue';
import * as Crypto from 'expo-crypto';

const ENTITY = 'payments';

function strip<T extends object>(record: T): T {
  const { _pendingSync, ...clean } = record as any;
  void _pendingSync;
  return clean as T;
}
function stripAll<T extends object>(records: T[]): T[] {
  return records.map(strip);
}

/** Back-fill patient info from the patients cache for records that are missing it. */
async function enrichWithPatient(records: PaymentWithPatient[]): Promise<PaymentWithPatient[]> {
  const patients = await offlineCache.getCollection<Patient>('patients');
  if (!patients || patients.length === 0) return records;
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  return records.map((pay) => {
    if ((pay as any).patient?.full_name && (pay as any).patient.full_name !== 'Unknown Patient') return pay;
    const p = patientMap.get(pay.patient_id);
    if (!p) return pay;
    return { ...pay, patient: { full_name: p.full_name, phone: p.phone } };
  });
}

// ─── getPayments ──────────────────────────────────────────────────────────────

export async function getPayments(
  page = 0,
  pageSize = 20,
  status?: string,
  dateFilter?: string,
): Promise<{ data: PaymentWithPatient[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await paymentService.getPayments(page, pageSize, status, dateFilter);
      if (!result.error && result.data && page === 0 && !status && !dateFilter) {
        await offlineCache.setCollection<PaymentWithPatient>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached = await offlineCache.getCollection<PaymentWithPatient>(ENTITY);
  if (cached === null) return { data: [], error: 'Offline — no cached data available' };

  let filtered = [...cached];

  if (status && status !== 'all') {
    filtered = filtered.filter((p) => p.status === status);
  }
  if (dateFilter) {
    filtered = filtered.filter((p) => p.payment_date === dateFilter);
  }

  // Sort: newest payment_date first, then created_at
  filtered.sort((a, b) => {
    const dateA = a.payment_date ?? a.created_at;
    const dateB = b.payment_date ?? b.created_at;
    return dateB.localeCompare(dateA);
  });

  const from = page * pageSize;
  const paginated = filtered.slice(from, from + pageSize);
  const enriched = await enrichWithPatient(paginated);

  return { data: stripAll(enriched), error: null };
}

// ─── getPaymentsByPatientId ───────────────────────────────────────────────────

export async function getPaymentsByPatientId(
  patientId: string,
): Promise<{ data: Payment[]; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await paymentService.getPaymentsByPatientId(patientId);
      if (!result.error && result.data) {
        await offlineCache.setRelation<Payment>(ENTITY, 'patient_id', patientId, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const cached = await offlineCache.getRelation<Payment>(ENTITY, 'patient_id', patientId);
  if (cached !== null) return { data: stripAll(cached), error: null };

  // Fallback: filter the main collection
  const all = await offlineCache.getCollection<Payment>(ENTITY);
  if (!all) return { data: [], error: 'Offline — no cached data available' };
  const filtered = all.filter((p) => p.patient_id === patientId);
  return { data: stripAll(filtered), error: null };
}

// ─── getRevenueStatistics ─────────────────────────────────────────────────────

export async function getRevenueStatistics(): Promise<{
  data: RevenueStats;
  error: string | null;
}> {
  if (getIsOnline()) {
    try {
      return await paymentService.getRevenueStatistics();
    } catch {
      // Fall through
    }
  }

  // Compute from cached payments
  const cached = await offlineCache.getCollection<Payment>(ENTITY);
  if (!cached) {
    return {
      data: { totalPaid: 0, totalPending: 0, thisMonthPaid: 0 },
      error: null,
    };
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats: RevenueStats = { totalPaid: 0, totalPending: 0, thisMonthPaid: 0 };

  for (const payment of cached) {
    if (payment.status === 'paid') {
      stats.totalPaid += payment.amount;
      if (payment.payment_date) {
        const d = new Date(payment.payment_date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          stats.thisMonthPaid += payment.amount;
        }
      }
    } else if (payment.status === 'pending' || payment.status === 'partially_paid') {
      stats.totalPending += payment.amount;
    }
  }

  return { data: stats, error: null };
}

// ─── createPayment ────────────────────────────────────────────────────────────

export async function createPayment(
  input: CreatePaymentInput,
): Promise<{ data: Payment | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await paymentService.createPayment(input);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Payment>(ENTITY, result.data);
        await offlineCache.upsertIntoRelation<Payment>(
          ENTITY,
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

  let patientObj = { full_name: 'Unknown Patient', phone: null as string | null };
  if (input.patient_id) {
    const p = await offlineCache.getRecord<Patient>('patients', input.patient_id);
    if (p) {
      patientObj.full_name = p.full_name;
      patientObj.phone = p.phone;
    }
  }

  const optimistic: any = {
    id: tempId,
    doctor_id: userId,
    created_at: now,
    updated_at: now,
    patient: patientObj,
    ...input,
  };

  await offlineCache.setRecord<Payment>(ENTITY, optimistic);
  await offlineCache.upsertIntoRelation<Payment>(
    ENTITY,
    'patient_id',
    optimistic.patient_id,
    optimistic,
  );

  const dependencies = input.patient_id?.startsWith('temp-') ? [input.patient_id] : [];
  if (input.attendance_id?.startsWith('temp-')) dependencies.push(input.attendance_id);

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

// ─── updatePaymentStatus ──────────────────────────────────────────────────────

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
): Promise<{ data: Payment | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await paymentService.updatePaymentStatus(id, status);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Payment>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const existing = await offlineCache.getRecord<Payment>(ENTITY, id);
  if (!existing) return { data: null, error: 'Offline — payment not cached' };

  const updated: Payment = { ...existing, status, updated_at: new Date().toISOString() };
  await offlineCache.setRecord<Payment>(ENTITY, updated);
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'update',
    recordId: id,
    payload: { status },
  });

  return { data: strip(updated), error: null };
}

// ─── updatePayment ────────────────────────────────────────────────────────────

export async function updatePayment(
  id: string,
  input: Partial<Omit<Payment, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>>,
): Promise<{ data: Payment | null; error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await paymentService.updatePayment(id, input);
      if (!result.error && result.data) {
        await offlineCache.setRecord<Payment>(ENTITY, result.data);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  const existing = await offlineCache.getRecord<Payment>(ENTITY, id);
  if (!existing) return { data: null, error: 'Offline — payment not cached' };

  const updated: Payment = { ...existing, ...input, updated_at: new Date().toISOString() };
  await offlineCache.setRecord<Payment>(ENTITY, updated);
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'update',
    recordId: id,
    payload: input as Record<string, unknown>,
  });

  return { data: strip(updated), error: null };
}

// ─── deletePayment ────────────────────────────────────────────────────────────

export async function deletePayment(
  id: string,
): Promise<{ error: string | null }> {
  if (getIsOnline()) {
    try {
      const result = await paymentService.deletePayment(id);
      if (!result.error) {
        await offlineCache.removeRecord<Payment>(ENTITY, id);
      }
      return result;
    } catch {
      // Fall through
    }
  }

  await offlineCache.removeRecord<Payment>(ENTITY, id);
  await syncQueue.enqueue({
    entity: ENTITY,
    operation: 'delete',
    recordId: id,
    payload: {},
  });

  return { error: null };
}

export type { PaymentWithPatient, RevenueStats, CreatePaymentInput };
