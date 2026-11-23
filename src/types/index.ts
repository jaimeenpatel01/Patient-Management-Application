import type { Session, User } from '@supabase/supabase-js';

// ─── Auth Types ───────────────────────────────────────────────

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  subscription: DoctorSubscription | null;
  billingSettings: BillingSettings;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  verifyRecoveryOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  isFirstTimeGoogleSignIn: boolean;
  setIsFirstTimeGoogleSignIn: (val: boolean) => void;
}

// ─── Profile Types ────────────────────────────────────────────

export type UserRole = 'doctor' | 'patient' | 'receptionist';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  clinic_phone: string | null;
  gst_number: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Status Types (used across the app) ───────────────────────

export type VisitType = 'Home' | 'Hospital' | "Doctor's Home";

export type PaymentStatus = 'paid' | 'pending' | 'partially_paid' | 'cancelled' | 'refunded';

export type PaymentType = 'consultation' | 'physiotherapy_session' | 'package' | 'other';

export type PaymentMethod = 'cash' | 'upi' | 'other';

export type Gender = 'male' | 'female';

// ─── Database Entity Types ────────────────────────────────────

export interface Patient {
  id: string;
  doctor_id: string;
  full_name: string;
  phone: string | null;
  age: number | null;
  gender: Gender | null;
  address: string | null;
  visit_type: VisitType | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  doctor_id: string;
  patient_id: string;
  attendance_date: string;
  attendance_time: string;
  notes: string | null;
  patient?: { full_name: string };
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  doctor_id: string;
  patient_id: string;
  attendance_id: string | null;
  consultation_date: string;
  symptoms: string | null;
  diagnosis: string | null;
  assessment: string | null;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Diagnosis {
  id: string;
  consultation_id: string;
  doctor_id: string;
  patient_id: string;
  title: string;
  symptoms: string | null;
  clinical_assessment: string | null;
  notes: string | null;
  diagnosis_date: string;
  created_at: string;
  updated_at: string;
}

export interface Treatment {
  id: string;
  consultation_id: string;
  doctor_id: string;
  patient_id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  frequency: string | null;
  duration: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExercisePlan {
  id: string;
  doctor_id: string;
  patient_id: string;
  consultation_id: string | null;
  name: string;
  description: string | null;
  sets: number | null;
  repetitions: number | null;
  duration: string | null;
  frequency: string | null;
  instructions: string | null;
  start_date: string | null;
  end_date: string | null;
  media_url: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentCategory = 'xray' | 'mri' | 'prescription' | 'report' | 'progress_photo' | 'exercise_doc' | 'other';

export interface Document {
  id: string;
  doctor_id: string;
  patient_id: string;
  consultation_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number | null;
  storage_path: string;
  category: DocumentCategory | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  doctor_id: string;
  patient_id: string;
  attendance_id: string | null;
  amount: number;
  payment_type: PaymentType;
  payment_method: PaymentMethod | null;
  status: PaymentStatus;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Waitlist ──────────────────────────────────────────────────

export type WaitlistStatus = 'waiting' | 'contacted' | 'scheduled' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  doctor_id: string;
  patient_id: string;
  requested_date: string | null;
  notes: string | null;
  status: WaitlistStatus;
  patient?: { full_name: string; phone: string | null };
  created_at: string;
  updated_at: string;
}

// ─── Subscriptions ─────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro';

export type BillingInterval = 'none' | 'monthly' | 'yearly';

export type SubscriptionStatus = 'trialing' | 'active' | 'expired' | 'cancelled';

export type BillingProvider = 'manual' | 'razorpay' | 'stripe' | 'apple_iap' | 'google_iap';

export type SubscriptionPaymentStatus = 'pending' | 'verified' | 'rejected';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  billing_interval: BillingInterval;
  price_inr: number;
  patient_cap: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DoctorSubscription {
  id: string;
  doctor_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  billing_provider: BillingProvider;
  provider_subscription_id: string | null;
  plan?: SubscriptionPlan | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  doctor_id: string;
  plan_id: string;
  amount_inr: number;
  payment_reference: string;
  payer_note: string | null;
  status: SubscriptionPaymentStatus;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Admin-editable billing values (billing_settings row + the free plan's patient_cap). */
export interface BillingSettings {
  upi_id: string;
  upi_payee_name: string;
  verification_sla_text: string;
  trial_days: number;
  free_patient_cap: number;
}

export type FeatureKey =
  | 'unlimited_patients'
  | 'business_reports'
  | 'export_data'
  | 'waitlist'
  | 'exercise_media'
  | 'gst_invoices'
  | 'calendar_export';
