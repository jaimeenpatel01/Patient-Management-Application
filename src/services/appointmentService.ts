import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/types';

export async function getAppointments(date?: string): Promise<{ data: Appointment[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  let query = supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', user.id)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });

  if (date) {
    query = query.eq('appointment_date', date);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data as Appointment[]) ?? [], error: null };
}

export async function getAppointmentById(id: string): Promise<{ data: Appointment | null; error: string | null }> {
  const { data, error } = await supabase.from('appointments').select('*').eq('id', id).single();
  if (error) return { data: null, error: error.message };
  return { data: data as Appointment, error: null };
}

export type CreateAppointmentInput = Omit<Appointment, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>;

export async function createAppointment(input: CreateAppointmentInput): Promise<{ data: Appointment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase.from('appointments').insert({ ...input, doctor_id: user.id }).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as Appointment, error: null };
}

export type UpdateAppointmentInput = Partial<CreateAppointmentInput>;

export async function updateAppointment(id: string, input: UpdateAppointmentInput): Promise<{ data: Appointment | null; error: string | null }> {
  const { data, error } = await supabase.from('appointments').update(input).eq('id', id).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as Appointment, error: null };
}

export async function deleteAppointment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) return { error: error.message };
  return { error: null };
}
