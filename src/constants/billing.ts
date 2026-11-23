import type { BillingSettings } from '@/types';

// Fallbacks only. The live values are edited in the admin portal (Settings tab) and stored in
// billing_settings / subscription_plans; these are used until they load (or offline with no cache).
export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  upi_id: '8106232103@ybl',
  upi_payee_name: 'Jaimeen Kumar Patel',
  verification_sla_text: 'within 24 hours',
  trial_days: 14,
  free_patient_cap: 10,
};
