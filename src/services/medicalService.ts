import { supabase } from '@/lib/supabase';
import type { Consultation, Diagnosis, Treatment, ExercisePlan } from '@/types';

// Consultations
export async function getConsultations(patientId: string): Promise<{ data: Consultation[]; error: string | null }> {
  const { data, error } = await supabase.from('consultations').select('*').eq('patient_id', patientId).order('consultation_date', { ascending: false });
  return { data: (data as Consultation[]) || [], error: error?.message || null };
}

export async function createConsultation(input: Omit<Consultation, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>): Promise<{ data: Consultation | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };
  const { data, error } = await supabase.from('consultations').insert({ ...input, doctor_id: user.id }).select().single();
  return { data: (data as Consultation) || null, error: error?.message || null };
}

// Diagnoses
export async function getDiagnoses(consultationId: string): Promise<{ data: Diagnosis[]; error: string | null }> {
  const { data, error } = await supabase.from('diagnoses').select('*').eq('consultation_id', consultationId);
  return { data: (data as Diagnosis[]) || [], error: error?.message || null };
}

export async function createDiagnosis(input: Omit<Diagnosis, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>): Promise<{ data: Diagnosis | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };
  const { data, error } = await supabase.from('diagnoses').insert({ ...input, doctor_id: user.id }).select().single();
  return { data: (data as Diagnosis) || null, error: error?.message || null };
}

// Treatments
export async function getTreatments(consultationId: string): Promise<{ data: Treatment[]; error: string | null }> {
  const { data, error } = await supabase.from('treatments').select('*').eq('consultation_id', consultationId);
  return { data: (data as Treatment[]) || [], error: error?.message || null };
}

export async function createTreatment(input: Omit<Treatment, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>): Promise<{ data: Treatment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };
  const { data, error } = await supabase.from('treatments').insert({ ...input, doctor_id: user.id }).select().single();
  return { data: (data as Treatment) || null, error: error?.message || null };
}

// Exercise Plans
export async function getExercisePlans(consultationId: string): Promise<{ data: ExercisePlan[]; error: string | null }> {
  const { data, error } = await supabase.from('exercise_plans').select('*').eq('consultation_id', consultationId);
  return { data: (data as ExercisePlan[]) || [], error: error?.message || null };
}

export async function createExercisePlan(input: Omit<ExercisePlan, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>): Promise<{ data: ExercisePlan | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };
  const { data, error } = await supabase.from('exercise_plans').insert({ ...input, doctor_id: user.id }).select().single();
  return { data: (data as ExercisePlan) || null, error: error?.message || null };
}

export async function updateConsultation(id: string, input: Partial<Omit<Consultation, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>>): Promise<{ data: Consultation | null; error: string | null }> {
  const { data, error } = await supabase.from('consultations').update(input).eq('id', id).select().single();
  return { data: (data as Consultation) || null, error: error?.message || null };
}

export async function deleteConsultation(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('consultations').delete().eq('id', id);
  return { error: error?.message || null };
}
