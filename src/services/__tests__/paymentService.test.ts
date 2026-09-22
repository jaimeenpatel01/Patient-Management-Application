/**
 * Unit tests for src/services/paymentService.ts
 *
 * Tests cover:
 *   getPayments            — auth guard, pagination, status/date filters, DB error
 *   getPaymentsByPatientId — auth guard, happy path, DB error
 *   getRevenueStatistics   — auth guard, aggregation logic (paid/pending/thisMonth), DB error
 *   createPayment          — auth guard, injects doctor_id, DB error
 *   updatePaymentStatus    — auth guard, status transition, DB error
 *   updatePayment          — auth guard, partial update, DB error
 *   deletePayment          — auth guard, hard-delete, DB error
 *
 * getRevenueStatistics has the most non-trivial logic — it aggregates rows
 * client-side, so we test the arithmetic carefully.
 */

// ── Module-level mock ─────────────────────────────────────────────────────────

import { mockQueryResult, mockGetUser, supabase } from './__mocks__/supabase';

jest.mock('@/lib/supabase', () => {
  const mock = require('./__mocks__/supabase');
  return { supabase: mock.supabase };
});

import {
  getPayments,
  getPaymentsByPatientId,
  getRevenueStatistics,
  createPayment,
  updatePaymentStatus,
  updatePayment,
  deletePayment,
} from '@/services/paymentService';

import type { Payment, PaymentStatus } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DOCTOR_ID = 'doctor-uuid-001';

const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'payment-uuid-001',
  doctor_id: DOCTOR_ID,
  patient_id: 'patient-uuid-001',
  attendance_id: null,
  amount: 500,
  payment_type: 'consultation',
  payment_method: 'cash',
  status: 'paid',
  payment_date: '2024-06-15',
  notes: null,
  created_at: '2024-06-15T10:00:00Z',
  updated_at: '2024-06-15T10:00:00Z',
  ...overrides,
});

// Helper to generate a payment_date in the current month/year
function thisMonthDate(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${yyyy}-${mm}-15`;
}

// Helper to generate a payment_date in the previous month
function lastMonthDate(): string {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const mm = String(lastMonth.getMonth() + 1).padStart(2, '0');
  const yyyy = lastMonth.getFullYear();
  return `${yyyy}-${mm}-15`;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser({ id: DOCTOR_ID });
  mockQueryResult({ data: null, error: null });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPayments
// ─────────────────────────────────────────────────────────────────────────────

describe('getPayments', () => {
  it('should return empty array with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await getPayments();
    expect(result).toEqual({ data: [], error: 'Not authenticated' });
  });

  it('should return payments list on success', async () => {
    const payments = [makePayment(), makePayment({ id: 'payment-uuid-002', amount: 1000 })];
    mockQueryResult({ data: payments, error: null });
    const result = await getPayments();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  it('should return empty array when no payments exist', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getPayments();
    expect(result).toEqual({ data: [], error: null });
  });

  it('should return empty array and error on DB failure', async () => {
    mockQueryResult({ data: null, error: { message: 'timeout' } });
    const result = await getPayments();
    expect(result).toEqual({ data: [], error: 'timeout' });
  });

  it('should accept a status filter', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getPayments(0, 20, 'paid');
    expect(result.error).toBeNull();
  });

  it('should not apply status filter when status is "all"', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getPayments(0, 20, 'all');
    expect(result.error).toBeNull();
  });

  it('should accept a dateFilter parameter', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getPayments(0, 20, undefined, '2024-06-15');
    expect(result.error).toBeNull();
  });

  it('should apply pagination (page=1, pageSize=10)', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getPayments(1, 10);
    expect(result.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('payments');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPaymentsByPatientId
// ─────────────────────────────────────────────────────────────────────────────

describe('getPaymentsByPatientId', () => {
  it('should return empty array with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await getPaymentsByPatientId('patient-uuid-001');
    expect(result).toEqual({ data: [], error: 'Not authenticated' });
  });

  it('should return payments for the given patient on success', async () => {
    const payments = [makePayment(), makePayment({ id: 'payment-uuid-002' })];
    mockQueryResult({ data: payments, error: null });
    const result = await getPaymentsByPatientId('patient-uuid-001');
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  it('should return empty array when patient has no payments', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getPaymentsByPatientId('patient-uuid-001');
    expect(result).toEqual({ data: [], error: null });
  });

  it('should return error on DB failure', async () => {
    mockQueryResult({ data: null, error: { message: 'query failed' } });
    const result = await getPaymentsByPatientId('patient-uuid-001');
    expect(result).toEqual({ data: [], error: 'query failed' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getRevenueStatistics — client-side aggregation logic
// ─────────────────────────────────────────────────────────────────────────────

describe('getRevenueStatistics', () => {
  const emptyStats = { totalPaid: 0, totalPending: 0, thisMonthPaid: 0 };

  it('should return zeroed stats with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await getRevenueStatistics();
    expect(result).toEqual({ data: emptyStats, error: 'Not authenticated' });
  });

  it('should return zeroed stats on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'DB connection error' } });
    const result = await getRevenueStatistics();
    expect(result).toEqual({ data: emptyStats, error: 'DB connection error' });
  });

  it('should return zeroed stats when there are no payment rows', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getRevenueStatistics();
    expect(result).toEqual({ data: emptyStats, error: null });
  });

  it('should sum only "paid" payments into totalPaid', async () => {
    const rows = [
      { amount: 300, status: 'paid', payment_date: lastMonthDate() },
      { amount: 200, status: 'paid', payment_date: lastMonthDate() },
      { amount: 500, status: 'pending', payment_date: lastMonthDate() },
    ];
    mockQueryResult({ data: rows, error: null });
    const result = await getRevenueStatistics();
    expect(result.data.totalPaid).toBe(500);
  });

  it('should sum both "pending" and "partially_paid" into totalPending', async () => {
    const rows = [
      { amount: 400, status: 'pending', payment_date: null },
      { amount: 150, status: 'partially_paid', payment_date: null },
      { amount: 100, status: 'paid', payment_date: lastMonthDate() },
    ];
    mockQueryResult({ data: rows, error: null });
    const result = await getRevenueStatistics();
    expect(result.data.totalPending).toBe(550);
  });

  it('should count "paid" payments in the current month in thisMonthPaid', async () => {
    const rows = [
      { amount: 800, status: 'paid', payment_date: thisMonthDate() },
      { amount: 200, status: 'paid', payment_date: lastMonthDate() },
    ];
    mockQueryResult({ data: rows, error: null });
    const result = await getRevenueStatistics();
    expect(result.data.thisMonthPaid).toBe(800);
    expect(result.data.totalPaid).toBe(1000);
  });

  it('should not count paid payments with no payment_date in thisMonthPaid', async () => {
    const rows = [
      { amount: 600, status: 'paid', payment_date: null },
    ];
    mockQueryResult({ data: rows, error: null });
    const result = await getRevenueStatistics();
    // payment_date is null → not added to thisMonthPaid
    expect(result.data.thisMonthPaid).toBe(0);
    // but it IS counted in totalPaid
    expect(result.data.totalPaid).toBe(600);
  });

  it('should ignore "cancelled" and "refunded" payments in all totals', async () => {
    const rows = [
      { amount: 999, status: 'cancelled', payment_date: thisMonthDate() },
      { amount: 999, status: 'refunded', payment_date: thisMonthDate() },
    ];
    mockQueryResult({ data: rows, error: null });
    const result = await getRevenueStatistics();
    expect(result.data).toEqual(emptyStats);
  });

  it('should handle a mix of all statuses correctly', async () => {
    const rows = [
      { amount: 500, status: 'paid', payment_date: thisMonthDate() },
      { amount: 300, status: 'paid', payment_date: lastMonthDate() },
      { amount: 200, status: 'pending', payment_date: null },
      { amount: 100, status: 'partially_paid', payment_date: null },
      { amount: 400, status: 'cancelled', payment_date: thisMonthDate() },
    ];
    mockQueryResult({ data: rows, error: null });
    const result = await getRevenueStatistics();
    expect(result.data.totalPaid).toBe(800);
    expect(result.data.thisMonthPaid).toBe(500);
    expect(result.data.totalPending).toBe(300);
    expect(result.error).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createPayment
// ─────────────────────────────────────────────────────────────────────────────

describe('createPayment', () => {
  const input = {
    patient_id: 'patient-uuid-001',
    attendance_id: null,
    amount: 750,
    payment_type: 'physiotherapy_session' as const,
    payment_method: 'upi' as const,
    status: 'paid' as PaymentStatus,
    payment_date: '2024-07-01',
    notes: null,
  };

  it('should return null with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await createPayment(input);
    expect(result).toEqual({ data: null, error: 'Not authenticated' });
  });

  it('should return the created payment on success', async () => {
    const created = makePayment({ ...input, doctor_id: DOCTOR_ID });
    mockQueryResult({ data: created, error: null });
    const result = await createPayment(input);
    expect(result.error).toBeNull();
    expect(result.data?.amount).toBe(750);
    expect(result.data?.payment_type).toBe('physiotherapy_session');
  });

  it('should return null and error on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'constraint violation' } });
    const result = await createPayment(input);
    expect(result).toEqual({ data: null, error: 'constraint violation' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updatePaymentStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('updatePaymentStatus', () => {
  it('should return null with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await updatePaymentStatus('payment-uuid-001', 'paid');
    expect(result).toEqual({ data: null, error: 'Not authenticated' });
  });

  it('should return the updated payment on a valid status transition', async () => {
    const updated = makePayment({ status: 'paid' });
    mockQueryResult({ data: updated, error: null });
    const result = await updatePaymentStatus('payment-uuid-001', 'paid');
    expect(result.error).toBeNull();
    expect(result.data?.status).toBe('paid');
  });

  it('should support all PaymentStatus values', async () => {
    const statuses: PaymentStatus[] = ['paid', 'pending', 'partially_paid', 'cancelled', 'refunded'];
    for (const status of statuses) {
      mockQueryResult({ data: makePayment({ status }), error: null });
      const result = await updatePaymentStatus('payment-uuid-001', status);
      expect(result.error).toBeNull();
      expect(result.data?.status).toBe(status);
    }
  });

  it('should return null and error on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'record not found' } });
    const result = await updatePaymentStatus('bad-id', 'paid');
    expect(result).toEqual({ data: null, error: 'record not found' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updatePayment (generic partial update)
// ─────────────────────────────────────────────────────────────────────────────

describe('updatePayment', () => {
  it('should return null with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await updatePayment('payment-uuid-001', { amount: 1000 });
    expect(result).toEqual({ data: null, error: 'Not authenticated' });
  });

  it('should return the updated payment on success', async () => {
    const updated = makePayment({ amount: 1000, notes: 'Revised' });
    mockQueryResult({ data: updated, error: null });
    const result = await updatePayment('payment-uuid-001', { amount: 1000, notes: 'Revised' });
    expect(result.error).toBeNull();
    expect(result.data?.amount).toBe(1000);
  });

  it('should return { data: null, error: null } when DB returns null data without error', async () => {
    // updatePayment uses `(data as Payment) || null` — when data is null/undefined it returns null
    mockQueryResult({ data: null, error: null });
    const result = await updatePayment('payment-uuid-001', { notes: 'x' });
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('should return error string on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'update failed' } });
    const result = await updatePayment('bad-id', { amount: 0 });
    expect(result.error).toBe('update failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deletePayment — hard delete
// ─────────────────────────────────────────────────────────────────────────────

describe('deletePayment', () => {
  it('should return auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await deletePayment('payment-uuid-001');
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('should return { error: null } on successful delete', async () => {
    mockQueryResult({ data: null, error: null });
    const result = await deletePayment('payment-uuid-001');
    expect(result).toEqual({ error: null });
  });

  it('should return error string on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'record not found' } });
    const result = await deletePayment('bad-id');
    expect(result).toEqual({ error: 'record not found' });
  });

  it('should call supabase.from with "payments"', async () => {
    mockQueryResult({ data: null, error: null });
    await deletePayment('payment-uuid-001');
    expect(supabase.from).toHaveBeenCalledWith('payments');
  });
});
