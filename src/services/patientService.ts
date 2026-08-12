import { supabase } from '@/lib/supabase';
import type { Patient } from '@/types';

// ─── Fetch all patients for the current doctor ────────────────

export async function getPatients(): Promise<{ data: Patient[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('doctor_id', user.id)
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data as Patient[]) ?? [], error: null };
}

// ─── Search patients by name or phone ─────────────────────────

export async function searchPatients(query: string): Promise<{ data: Patient[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('doctor_id', user.id)
    .eq('is_active', true)
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .order('full_name', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data as Patient[]) ?? [], error: null };
}

// ─── Get a single patient by ID ───────────────────────────────

export async function getPatientById(id: string): Promise<{ data: Patient | null; error: string | null }> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Patient, error: null };
}

// ─── Create a new patient ─────────────────────────────────────

export type CreatePatientInput = Omit<Patient, 'id' | 'doctor_id' | 'is_active' | 'created_at' | 'updated_at'>;

export async function createPatient(input: CreatePatientInput): Promise<{ data: Patient | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...input,
      doctor_id: user.id,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Patient, error: null };
}

// ─── Update an existing patient ───────────────────────────────

export type UpdatePatientInput = Partial<CreatePatientInput>;

export async function updatePatient(id: string, input: UpdatePatientInput): Promise<{ data: Patient | null; error: string | null }> {
  const { data, error } = await supabase
    .from('patients')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Patient, error: null };
}

// ─── Soft-delete a patient (set is_active = false) ────────────

export async function deletePatient(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('patients')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return { error: error.message };
  return { error: null };
}
