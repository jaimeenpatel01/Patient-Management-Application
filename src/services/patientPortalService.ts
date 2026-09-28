import { supabase } from '@/lib/supabase';
import type { Attendance, ExercisePlan, Patient } from '@/types';

/**
 * Thin, patient-scoped read functions for the read-only patient portal.
 *
 * These intentionally do NOT filter by `doctor_id` the way the doctor-facing
 * services do — the caller here is the patient themself, and access is
 * enforced entirely by the "Patients can view own ..." RLS policies added in
 * `010_feature_additions.sql`. No writes live here beyond the sanctioned
 * invite-claim RPC.
 */

// ─── Claim a patient record using the invite code the doctor shared ────────

export async function claimPatientInvite(
  inviteCode: string
): Promise<{ data: Patient | null; error: string | null }> {
  const code = inviteCode.trim().toLowerCase();
  if (!code) {
    return { data: null, error: 'Please enter your invite code.' };
  }

  const { data, error } = await supabase.rpc('claim_patient_invite', {
    p_invite_code: code,
  });

  if (error) return { data: null, error: error.message };
  return { data: data as Patient, error: null };
}

// ─── The signed-in patient's own linked record (+ their physio's name) ────

export type MyPatientProfile = Patient & {
  doctor: { full_name: string | null } | null;
};

export async function getMyPatientProfile(): Promise<{
  data: MyPatientProfile | null;
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  // Note: the nested `doctor:profiles(full_name)` embed is scoped by RLS on
  // `profiles` (which only allows a user to read their own profile row), so
  // it will resolve to `null` for a patient caller rather than erroring.
  const { data, error } = await supabase
    .from('patients')
    .select('*, doctor:profiles(full_name)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as MyPatientProfile | null, error: null };
}

// ─── Next upcoming attendance for a given patient ──────────────────────────

export async function getUpcomingAttendanceForPatient(
  patientId: string
): Promise<{ data: Attendance | null; error: string | null }> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('patient_id', patientId)
    .gte('attendance_date', today)
    .order('attendance_date', { ascending: true })
    .order('attendance_time', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as Attendance | null, error: null };
}

// ─── All exercise plans assigned to a given patient ────────────────────────

export async function getExercisePlansForPatient(
  patientId: string
): Promise<{ data: ExercisePlan[]; error: string | null }> {
  const { data, error } = await supabase
    .from('exercise_plans')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as ExercisePlan[]) ?? [], error: null };
}
