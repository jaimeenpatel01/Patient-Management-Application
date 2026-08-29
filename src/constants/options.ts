/**
 * Shared form option constants used across add/edit screens.
 */
import type { Gender, VisitType, PaymentType, PaymentMethod, PaymentStatus, DocumentCategory } from '@/types';

export const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

export const VISIT_TYPE_OPTIONS: { label: string; value: VisitType }[] = [
  { label: 'Home', value: 'Home' },
  { label: 'Hospital', value: 'Hospital' },
  { label: "Doctor's Home", value: "Doctor's Home" },
];

export const PAYMENT_TYPES: { label: string; value: PaymentType }[] = [
  { label: 'Consultation', value: 'consultation' },
  { label: 'Physiotherapy Session', value: 'physiotherapy_session' },
  { label: 'Package', value: 'package' },
  { label: 'Other', value: 'other' },
];

export const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Other', value: 'other' },
];

export const PAYMENT_STATUSES: { label: string; value: PaymentStatus }[] = [
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Partially Paid', value: 'partially_paid' },
];

export const DOCUMENT_CATEGORIES: { label: string; value: DocumentCategory }[] = [
  { label: 'X-Ray', value: 'xray' },
  { label: 'MRI', value: 'mri' },
  { label: 'Prescription', value: 'prescription' },
  { label: 'Report', value: 'report' },
  { label: 'Progress Photo', value: 'progress_photo' },
  { label: 'Exercise Doc', value: 'exercise_doc' },
  { label: 'Other', value: 'other' },
];

export const APP_VERSION = '2.1.0';
export const SUPPORT_EMAIL = 'doctor.app.devv@gmail.com';
