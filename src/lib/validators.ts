/**
 * Shared form validation helpers.
 */

import type { Gender, VisitType } from '@/types';

export interface PatientFormData {
  fullName: string;
  phone: string;
  age: string;
  gender: Gender | null;
  visitType: VisitType | null;
  address: string;
}

export function validatePatientForm(data: PatientFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.fullName.trim()) {
    errors.fullName = 'Full name is required';
  }

  if (!data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(data.phone.trim())) {
    errors.phone = 'Phone number must be exactly 10 digits';
  }

  if (!data.age.trim()) {
    errors.age = 'Age is required';
  } else if (isNaN(Number(data.age.trim())) || Number(data.age.trim()) < 0) {
    errors.age = 'Please enter a valid age';
  }

  if (!data.gender) {
    errors.gender = 'Gender is required';
  }

  if (!data.visitType) {
    errors.visitType = 'Visit type is required';
  }

  if (!data.address.trim()) {
    errors.address = 'Address is required';
  }

  return errors;
}
