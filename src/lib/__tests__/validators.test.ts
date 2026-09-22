/**
 * Unit tests for src/lib/validators.ts
 *
 * validatePatientForm is a pure function — no mocks required.
 * Tests cover:
 *   - Happy path: all fields valid
 *   - Each required field missing individually
 *   - Phone format edge cases (9-digit, 11-digit, letters, exactly 10-digit)
 *   - Age edge cases (negative, non-numeric, decimal string, zero)
 *   - Whitespace-only values treated as missing
 *   - Multiple errors returned simultaneously
 */

import { validatePatientForm, PatientFormData } from '@/lib/validators';
import type { Gender, VisitType } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_DATA: PatientFormData = {
  fullName: 'Priya Sharma',
  phone: '9876543210',
  age: '35',
  gender: 'female' as Gender,
  visitType: 'Hospital' as VisitType,
  address: '12 MG Road, Bengaluru',
};

// Helper: override specific fields in the valid fixture
function makeData(overrides: Partial<PatientFormData>): PatientFormData {
  return { ...VALID_DATA, ...overrides };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('validatePatientForm', () => {
  afterEach(() => {
    // Pure function — nothing to reset, but good practice to document isolation
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe('when all fields are valid', () => {
    it('should return an empty errors object', () => {
      const errors = validatePatientForm(VALID_DATA);
      expect(errors).toEqual({});
    });

    it('should accept all valid VisitType values', () => {
      const visitTypes: VisitType[] = ['Home', 'Hospital', "Doctor's Home"];
      for (const visitType of visitTypes) {
        const errors = validatePatientForm(makeData({ visitType }));
        expect(errors.visitType).toBeUndefined();
      }
    });

    it('should accept all valid Gender values', () => {
      const genders: Gender[] = ['male', 'female'];
      for (const gender of genders) {
        const errors = validatePatientForm(makeData({ gender }));
        expect(errors.gender).toBeUndefined();
      }
    });

    it('should accept age of zero (newborn)', () => {
      const errors = validatePatientForm(makeData({ age: '0' }));
      expect(errors.age).toBeUndefined();
    });
  });

  // ── fullName validation ─────────────────────────────────────────────────────

  describe('fullName', () => {
    it('should error when fullName is empty', () => {
      const errors = validatePatientForm(makeData({ fullName: '' }));
      expect(errors.fullName).toBe('Full name is required');
    });

    it('should error when fullName is only whitespace', () => {
      const errors = validatePatientForm(makeData({ fullName: '   ' }));
      expect(errors.fullName).toBe('Full name is required');
    });

    it('should not error when fullName has leading/trailing whitespace around a real name', () => {
      const errors = validatePatientForm(makeData({ fullName: '  Ravi Kumar  ' }));
      expect(errors.fullName).toBeUndefined();
    });
  });

  // ── phone validation ────────────────────────────────────────────────────────

  describe('phone', () => {
    it('should error when phone is empty', () => {
      const errors = validatePatientForm(makeData({ phone: '' }));
      expect(errors.phone).toBe('Phone number is required');
    });

    it('should error when phone is only whitespace', () => {
      const errors = validatePatientForm(makeData({ phone: '   ' }));
      expect(errors.phone).toBe('Phone number is required');
    });

    it('should error when phone has 9 digits (too short)', () => {
      const errors = validatePatientForm(makeData({ phone: '987654321' }));
      expect(errors.phone).toBe('Phone number must be exactly 10 digits');
    });

    it('should error when phone has 11 digits (too long)', () => {
      const errors = validatePatientForm(makeData({ phone: '98765432101' }));
      expect(errors.phone).toBe('Phone number must be exactly 10 digits');
    });

    it('should error when phone contains letters', () => {
      const errors = validatePatientForm(makeData({ phone: '98765abcde' }));
      expect(errors.phone).toBe('Phone number must be exactly 10 digits');
    });

    it('should error when phone contains spaces between digits', () => {
      const errors = validatePatientForm(makeData({ phone: '98765 43210' }));
      expect(errors.phone).toBe('Phone number must be exactly 10 digits');
    });

    it('should error when phone contains hyphens', () => {
      const errors = validatePatientForm(makeData({ phone: '9876-543210' }));
      expect(errors.phone).toBe('Phone number must be exactly 10 digits');
    });

    it('should not error when phone is exactly 10 digits', () => {
      const errors = validatePatientForm(makeData({ phone: '9876543210' }));
      expect(errors.phone).toBeUndefined();
    });

    it('should strip leading/trailing whitespace before validation (valid 10-digit)', () => {
      const errors = validatePatientForm(makeData({ phone: ' 9876543210 ' }));
      expect(errors.phone).toBeUndefined();
    });
  });

  // ── age validation ──────────────────────────────────────────────────────────

  describe('age', () => {
    it('should error when age is empty', () => {
      const errors = validatePatientForm(makeData({ age: '' }));
      expect(errors.age).toBe('Age is required');
    });

    it('should error when age is only whitespace', () => {
      const errors = validatePatientForm(makeData({ age: '  ' }));
      expect(errors.age).toBe('Age is required');
    });

    it('should error when age is non-numeric text', () => {
      const errors = validatePatientForm(makeData({ age: 'abc' }));
      expect(errors.age).toBe('Please enter a valid age');
    });

    it('should error when age is negative', () => {
      const errors = validatePatientForm(makeData({ age: '-1' }));
      expect(errors.age).toBe('Please enter a valid age');
    });

    it('should not error for a decimal age string (e.g. "1.5" — passes Number() check)', () => {
      // Number('1.5') = 1.5, which is >= 0, so no error is expected
      const errors = validatePatientForm(makeData({ age: '1.5' }));
      expect(errors.age).toBeUndefined();
    });

    it('should not error for a large but plausible age', () => {
      const errors = validatePatientForm(makeData({ age: '120' }));
      expect(errors.age).toBeUndefined();
    });
  });

  // ── gender validation ───────────────────────────────────────────────────────

  describe('gender', () => {
    it('should error when gender is null', () => {
      const errors = validatePatientForm(makeData({ gender: null }));
      expect(errors.gender).toBe('Gender is required');
    });
  });

  // ── visitType validation ────────────────────────────────────────────────────

  describe('visitType', () => {
    it('should error when visitType is null', () => {
      const errors = validatePatientForm(makeData({ visitType: null }));
      expect(errors.visitType).toBe('Visit type is required');
    });
  });

  // ── address validation ──────────────────────────────────────────────────────

  describe('address', () => {
    it('should error when address is empty', () => {
      const errors = validatePatientForm(makeData({ address: '' }));
      expect(errors.address).toBe('Address is required');
    });

    it('should error when address is only whitespace', () => {
      const errors = validatePatientForm(makeData({ address: '\t\n  ' }));
      expect(errors.address).toBe('Address is required');
    });

    it('should not error when address has leading/trailing whitespace around real content', () => {
      const errors = validatePatientForm(makeData({ address: '  Block A  ' }));
      expect(errors.address).toBeUndefined();
    });
  });

  // ── multiple simultaneous errors ────────────────────────────────────────────

  describe('multiple field errors', () => {
    it('should return errors for all invalid fields at once', () => {
      const allInvalid: PatientFormData = {
        fullName: '',
        phone: '',
        age: '',
        gender: null,
        visitType: null,
        address: '',
      };
      const errors = validatePatientForm(allInvalid);
      expect(errors.fullName).toBeDefined();
      expect(errors.phone).toBeDefined();
      expect(errors.age).toBeDefined();
      expect(errors.gender).toBeDefined();
      expect(errors.visitType).toBeDefined();
      expect(errors.address).toBeDefined();
    });

    it('should return only errors for the specific invalid fields', () => {
      const partiallyInvalid = makeData({ phone: 'abc', gender: null });
      const errors = validatePatientForm(partiallyInvalid);
      expect(errors.phone).toBe('Phone number must be exactly 10 digits');
      expect(errors.gender).toBe('Gender is required');
      // Other fields should have no errors
      expect(errors.fullName).toBeUndefined();
      expect(errors.age).toBeUndefined();
      expect(errors.visitType).toBeUndefined();
      expect(errors.address).toBeUndefined();
    });
  });
});
