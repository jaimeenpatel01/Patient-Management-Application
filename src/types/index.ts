import type { Session, User } from '@supabase/supabase-js';

// ─── Auth Types ───────────────────────────────────────────────

export interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
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

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type PaymentStatus = 'paid' | 'pending' | 'partially_paid' | 'cancelled' | 'refunded';

export type PaymentType = 'consultation' | 'physiotherapy_session' | 'package' | 'other';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other';

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
