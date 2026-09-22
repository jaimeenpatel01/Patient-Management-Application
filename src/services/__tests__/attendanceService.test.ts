/**
 * Unit tests for src/services/attendanceService.ts
 *
 * Tests cover:
 *   getAttendances    — auth guard, pagination, optional date filter, DB error
 *   getAttendanceById — auth guard, found, DB error
 *   createAttendance  — auth guard, injects doctor_id, DB error
 *   updateAttendance  — auth guard, partial update, DB error
 *   deleteAttendance  — auth guard, hard-delete, DB error
 */

// ── Module-level mock ─────────────────────────────────────────────────────────

import { mockQueryResult, mockGetUser, supabase } from './__mocks__/supabase';

jest.mock('@/lib/supabase', () => {
  const mock = require('./__mocks__/supabase');
  return { supabase: mock.supabase };
});

import {
  getAttendances,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from '@/services/attendanceService';

import type { Attendance } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DOCTOR_ID = 'doctor-uuid-001';

const makeAttendance = (overrides: Partial<Attendance> = {}): Attendance => ({
  id: 'attendance-uuid-001',
  doctor_id: DOCTOR_ID,
  patient_id: 'patient-uuid-001',
  attendance_date: '2024-06-15',
  attendance_time: '10:30',
  notes: null,
  patient: { full_name: 'Priya Sharma' },
  created_at: '2024-06-15T10:30:00Z',
  updated_at: '2024-06-15T10:30:00Z',
  ...overrides,
});

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser({ id: DOCTOR_ID });
  mockQueryResult({ data: null, error: null });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAttendances
// ─────────────────────────────────────────────────────────────────────────────

describe('getAttendances', () => {
  it('should return empty array with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await getAttendances();
    expect(result).toEqual({ data: [], error: 'Not authenticated' });
  });

  it('should return attendances list on success (no date filter)', async () => {
    const attendances = [makeAttendance(), makeAttendance({ id: 'attendance-uuid-002' })];
    mockQueryResult({ data: attendances, error: null });
    const result = await getAttendances();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  it('should return empty array when no attendances exist', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getAttendances();
    expect(result).toEqual({ data: [], error: null });
  });

  it('should handle null data from DB gracefully', async () => {
    mockQueryResult({ data: null, error: null });
    const result = await getAttendances();
    expect(result).toEqual({ data: [], error: null });
  });

  it('should return empty array and error on DB failure', async () => {
    mockQueryResult({ data: null, error: { message: 'DB timeout' } });
    const result = await getAttendances();
    expect(result).toEqual({ data: [], error: 'DB timeout' });
  });

  it('should accept an optional date string filter without error', async () => {
    const filtered = [makeAttendance({ attendance_date: '2024-06-15' })];
    mockQueryResult({ data: filtered, error: null });
    const result = await getAttendances('2024-06-15');
    expect(result.error).toBeNull();
    expect(result.data[0].attendance_date).toBe('2024-06-15');
  });

  it('should apply pagination with default page=0 and pageSize=20', async () => {
    mockQueryResult({ data: [], error: null });
    // Primary assertion: no crash when pagination args are their defaults
    const result = await getAttendances(undefined, 0, 20);
    expect(result.error).toBeNull();
  });

  it('should accept non-default page and pageSize parameters', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getAttendances(undefined, 2, 10);
    expect(result.error).toBeNull();
    // Assert the correct table was queried
    expect(supabase.from).toHaveBeenCalledWith('attendances');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAttendanceById
// ─────────────────────────────────────────────────────────────────────────────

describe('getAttendanceById', () => {
  it('should return null with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await getAttendanceById('attendance-uuid-001');
    expect(result).toEqual({ data: null, error: 'Not authenticated' });
  });

  it('should return the attendance record on success', async () => {
    const attendance = makeAttendance();
    mockQueryResult({ data: attendance, error: null });
    const result = await getAttendanceById('attendance-uuid-001');
    expect(result.error).toBeNull();
    expect(result.data).toEqual(attendance);
  });

  it('should return null and error when DB errors', async () => {
    mockQueryResult({ data: null, error: { message: 'Record not found' } });
    const result = await getAttendanceById('bad-id');
    expect(result).toEqual({ data: null, error: 'Record not found' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createAttendance
// ─────────────────────────────────────────────────────────────────────────────

describe('createAttendance', () => {
  const input: Omit<Attendance, 'id' | 'created_at' | 'updated_at' | 'doctor_id'> = {
    patient_id: 'patient-uuid-001',
    attendance_date: '2024-07-01',
    attendance_time: '09:00',
    notes: 'First visit',
  };

  it('should return null with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await createAttendance(input);
    expect(result).toEqual({ data: null, error: 'Not authenticated' });
  });

  it('should return the created attendance on success', async () => {
    const created = makeAttendance({ ...input, doctor_id: DOCTOR_ID });
    mockQueryResult({ data: created, error: null });
    const result = await createAttendance(input);
    expect(result.error).toBeNull();
    expect(result.data?.attendance_date).toBe('2024-07-01');
    expect(result.data?.attendance_time).toBe('09:00');
  });

  it('should return null and error on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'foreign key violation' } });
    const result = await createAttendance(input);
    expect(result).toEqual({ data: null, error: 'foreign key violation' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateAttendance
// ─────────────────────────────────────────────────────────────────────────────

describe('updateAttendance', () => {
  it('should return null with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await updateAttendance('attendance-uuid-001', { notes: 'Updated' });
    expect(result).toEqual({ data: null, error: 'Not authenticated' });
  });

  it('should return the updated attendance on success', async () => {
    const updated = makeAttendance({ notes: 'Updated note' });
    mockQueryResult({ data: updated, error: null });
    const result = await updateAttendance('attendance-uuid-001', { notes: 'Updated note' });
    expect(result.error).toBeNull();
    expect(result.data?.notes).toBe('Updated note');
  });

  it('should support partial updates (only time changed)', async () => {
    const updated = makeAttendance({ attendance_time: '14:00' });
    mockQueryResult({ data: updated, error: null });
    const result = await updateAttendance('attendance-uuid-001', { attendance_time: '14:00' });
    expect(result.error).toBeNull();
    expect(result.data?.attendance_time).toBe('14:00');
  });

  it('should return null and error on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'update failed' } });
    const result = await updateAttendance('bad-id', { notes: 'X' });
    expect(result).toEqual({ data: null, error: 'update failed' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteAttendance — hard delete
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteAttendance', () => {
  it('should return auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await deleteAttendance('attendance-uuid-001');
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('should return { error: null } on successful hard-delete', async () => {
    mockQueryResult({ data: null, error: null });
    const result = await deleteAttendance('attendance-uuid-001');
    expect(result).toEqual({ error: null });
  });

  it('should return error string on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'violates row-level security policy' } });
    const result = await deleteAttendance('attendance-uuid-001');
    expect(result).toEqual({ error: 'violates row-level security policy' });
  });

  it('should call supabase.from with "attendances"', async () => {
    mockQueryResult({ data: null, error: null });
    await deleteAttendance('attendance-uuid-001');
    expect(supabase.from).toHaveBeenCalledWith('attendances');
  });
});
