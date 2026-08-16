import type { Session, User } from '@supabase/supabase-js';

// ─── Auth Types ───────────────────────────────────────────────

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
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
  created_at: string;
  updated_at: string;
}

// ─── Status Types (used across the app) ───────────────────────

export type VisitType = 'Home Visit' | 'Hospital Visit' | "Doctor's Home Visit";

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
