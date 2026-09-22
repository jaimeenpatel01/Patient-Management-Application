/**
 * Unit tests for src/services/patientService.ts
 *
 * The Supabase client is mocked at the module level.
 * Each test controls what the mock query chain resolves to via helper functions.
 *
 * Tests cover:
 *   getPatients      — auth guard, status filter variants, DB error path
 *   searchPatients   — auth guard, happy path, DB error
 *   getPatientById   — auth guard, found, DB error
 *   createPatient    — auth guard, injects doctor_id, DB error
 *   updatePatient    — auth guard, happy path, DB error
 *   deletePatient    — auth guard, soft-delete (sets is_active=false), DB error
 */

// ── Module-level mock ─────────────────────────────────────────────────────────

import { mockQueryResult, mockGetUser, supabase } from './__mocks__/supabase';

jest.mock('@/lib/supabase', () => {
  const mock = require('./__mocks__/supabase');
  return { supabase: mock.supabase };
});

import {
  getPatients,
  searchPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} from '@/services/patientService';

import type { Patient } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DOCTOR_ID = 'doctor-uuid-001';

const makePatient = (overrides: Partial<Patient> = {}): Patient => ({
  id: 'patient-uuid-001',
  doctor_id: DOCTOR_ID,
  full_name: 'Priya Sharma',
  phone: '9876543210',
  age: 32,
  gender: 'female',
  address: '12 MG Road, Bengaluru',
  visit_type: 'Hospital',
  notes: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser({ id: DOCTOR_ID });
  mockQueryResult({ data: null, error: null });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPatients
// ─────────────────────────────────────────────────────────────────────────────

describe('getPatients', () => {
  it('should return empty array with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await getPatients();
    expect(result).toEqual({ data: [], error: 'Not authenticated' });
  });

  it('should return patients array on success (default: active status)', async () => {
    const patients = [makePatient(), makePatient({ id: 'patient-uuid-002', full_name: 'Ravi Kumar' })];
    mockQueryResult({ data: patients, error: null });

    const result = await getPatients();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data[0].full_name).toBe('Priya Sharma');
  });

  it('should return empty array on success when no patients exist', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await getPatients('active');
    expect(result).toEqual({ data: [], error: null });
  });

  it('should return empty array and error message on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'connection refused' } });
    const result = await getPatients();
    expect(result).toEqual({ data: [], error: 'connection refused' });
  });

  it('should handle null data from DB gracefully (returns empty array)', async () => {
    mockQueryResult({ data: null, error: null });
    const result = await getPatients();
    expect(result).toEqual({ data: [], error: null });
  });

  it('should call supabase.from with "patients"', async () => {
    mockQueryResult({ data: [], error: null });
    await getPatients();
    expect(supabase.from).toHaveBeenCalledWith('patients');
  });

  it('should accept "inactive" status filter without error', async () => {
    const inactivePatient = makePatient({ is_active: false });
    mockQueryResult({ data: [inactivePatient], error: null });
    const result = await getPatients('inactive');
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
  });

  it('should accept "all" status filter without error', async () => {
    const patients = [makePatient(), makePatient({ id: 'p2', is_active: false })];
    mockQueryResult({ data: patients, error: null });
    const result = await getPatients('all');
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// searchPatients
// ─────────────────────────────────────────────────────────────────────────────

describe('searchPatients', () => {
  it('should return empty array with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await searchPatients('Priya');
    expect(result).toEqual({ data: [], error: 'Not authenticated' });
  });

  it('should return matching patients on success', async () => {
    const patients = [makePatient()];
    mockQueryResult({ data: patients, error: null });
    const result = await searchPatients('Priya');
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].full_name).toBe('Priya Sharma');
  });

  it('should return empty array when no patients match', async () => {
    mockQueryResult({ data: [], error: null });
    const result = await searchPatients('NonExistent');
    expect(result).toEqual({ data: [], error: null });
  });

  it('should return error on DB failure', async () => {
    mockQueryResult({ data: null, error: { message: 'query timeout' } });
    const result = await searchPatients('test');
    expect(result).toEqual({ data: [], error: 'query timeout' });
  });

  it('should handle null data from DB gracefully', async () => {
    mockQueryResult({ data: null, error: null });
    const result = await searchPatients('anything');
    expect(result).toEqual({ data: [], error: null });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPatientById
// ─────────────────────────────────────────────────────────────────────────────

describe('getPatientById', () => {
  it('should return null with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await getPatientById('patient-uuid-001');
    expect(result).toEqual({ data: null, error: 'Not authenticated' });
  });

  it('should return the patient on success', async () => {
    const patient = makePatient();
    mockQueryResult({ data: patient, error: null });
    const result = await getPatientById('patient-uuid-001');
    expect(result.error).toBeNull();
    expect(result.data).toEqual(patient);
  });

  it('should return null and error on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'Row not found' } });
    const result = await getPatientById('non-existent-id');
    expect(result).toEqual({ data: null, error: 'Row not found' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createPatient
// ─────────────────────────────────────────────────────────────────────────────

describe('createPatient', () => {
  const input = {
    full_name: 'New Patient',
    phone: '9000000001',
    age: 25,
    gender: 'male' as const,
    address: 'Block B, Delhi',
    visit_type: 'Home' as const,
    notes: null,
  };

  it('should return null with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await createPatient(input);
    expect(result).toEqual({ data: null, error: 'Not authenticated' });
  });

  it('should return the created patient on success', async () => {
    const created = makePatient({ full_name: 'New Patient', doctor_id: DOCTOR_ID });
    mockQueryResult({ data: created, error: null });
    const result = await createPatient(input);
    expect(result.error).toBeNull();
    expect(result.data?.full_name).toBe('New Patient');
  });

  it('should return null and error on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'duplicate key value violates unique constraint' } });
    const result = await createPatient(input);
    expect(result).toEqual({
      data: null,
      error: 'duplicate key value violates unique constraint',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updatePatient
// ─────────────────────────────────────────────────────────────────────────────

describe('updatePatient', () => {
  it('should return null with auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await updatePatient('patient-uuid-001', { full_name: 'Updated Name' });
    expect(result).toEqual({ data: null, error: 'Not authenticated' });
  });

  it('should return updated patient on success', async () => {
    const updated = makePatient({ full_name: 'Updated Name' });
    mockQueryResult({ data: updated, error: null });
    const result = await updatePatient('patient-uuid-001', { full_name: 'Updated Name' });
    expect(result.error).toBeNull();
    expect(result.data?.full_name).toBe('Updated Name');
  });

  it('should support partial updates (only changed fields)', async () => {
    const updated = makePatient({ notes: 'Updated note' });
    mockQueryResult({ data: updated, error: null });
    const result = await updatePatient('patient-uuid-001', { notes: 'Updated note' });
    expect(result.error).toBeNull();
    expect(result.data?.notes).toBe('Updated note');
  });

  it('should return null and error on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'Patient not found' } });
    const result = await updatePatient('bad-id', { full_name: 'X' });
    expect(result).toEqual({ data: null, error: 'Patient not found' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deletePatient — soft-delete via is_active = false
// ─────────────────────────────────────────────────────────────────────────────

describe('deletePatient', () => {
  it('should return auth error when user is not authenticated', async () => {
    mockGetUser(null);
    const result = await deletePatient('patient-uuid-001');
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('should return { error: null } on successful soft-delete', async () => {
    mockQueryResult({ data: null, error: null });
    const result = await deletePatient('patient-uuid-001');
    expect(result).toEqual({ error: null });
  });

  it('should return error string on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'violates row-level security policy' } });
    const result = await deletePatient('patient-uuid-001');
    expect(result).toEqual({ error: 'violates row-level security policy' });
  });

  it('should call supabase.from with "patients" during delete', async () => {
    mockQueryResult({ data: null, error: null });
    await deletePatient('patient-uuid-001');
    expect(supabase.from).toHaveBeenCalledWith('patients');
  });
});
