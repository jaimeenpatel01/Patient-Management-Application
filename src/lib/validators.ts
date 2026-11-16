/**
 * Shared form validation helpers.
 */

import type { Gender, RecurrenceEndType, RecurrenceFrequency, VisitType } from '@/types';

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

export interface AppointmentFormData {
  patientId: string | null;
  date: string;
  time: string;
  frequency: RecurrenceFrequency | null;
  daysOfWeek: number[];
  endType: RecurrenceEndType | null;
  endDate: string;
  occurrencesCount: string;
}

export function validateAppointmentForm(data: AppointmentFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.patientId) {
    errors.patient = 'Select a patient';
  }

  if (!data.date) {
    errors.date = 'Date is required';
  }

  if (!data.time) {
    errors.time = 'Time is required';
  }

  if (!data.frequency) {
    errors.frequency = 'Select a frequency';
    return errors;
  }

  if ((data.frequency === 'weekly' || data.frequency === 'biweekly') && data.daysOfWeek.length === 0) {
    errors.daysOfWeek = 'Select at least one day of the week';
  }

  if (data.frequency !== 'one_off') {
    if (!data.endType) {
      errors.endType = 'Select when this schedule should end';
    } else if (data.endType === 'occurrences') {
      const count = Number(data.occurrencesCount.trim());
      if (!data.occurrencesCount.trim() || isNaN(count) || count < 1) {
        errors.occurrencesCount = 'Enter a valid number of occurrences';
      }
    } else if (data.endType === 'end_date') {
      if (!data.endDate) {
        errors.endDate = 'End date is required';
      } else if (data.date && data.endDate < data.date) {
        errors.endDate = 'End date must be after the start date';
      }
    }
  }

  return errors;
}
