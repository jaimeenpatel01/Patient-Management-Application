import { supabase } from '@/lib/supabase';
import type { Attendance } from '@/types';

export async function getAttendances(date?: string, page = 0, pageSize = 20): Promise<{ data: Attendance[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  let query = supabase
    .from('attendances')
    .select('*, patient:patients(full_name)')
    .eq('doctor_id', user.id)
    .order('attendance_date', { ascending: false })
    .order('attendance_time', { ascending: false });

  if (date) {
    query = query.eq('attendance_date', date);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data as Attendance[]) ?? [], error: null };
}

export async function getAttendanceById(id: string): Promise<{ data: Attendance | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('id', id)
    .eq('doctor_id', user.id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Attendance, error: null };
}

export async function createAttendance(input: Omit<Attendance, 'id' | 'created_at' | 'updated_at' | 'doctor_id'>): Promise<{ data: Attendance | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('attendances')
    .insert({ ...input, doctor_id: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Attendance, error: null };
}

export async function updateAttendance(id: string, input: Partial<Omit<Attendance, 'id' | 'created_at' | 'updated_at' | 'doctor_id'>>): Promise<{ data: Attendance | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('attendances')
    .update(input)
    .eq('id', id)
    .eq('doctor_id', user.id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Attendance, error: null };
}

export async function deleteAttendance(id: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('attendances')
    .delete()
    .eq('id', id)
    .eq('doctor_id', user.id);
  if (error) return { error: error.message };
  return { error: null };
}
