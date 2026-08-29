import { supabase } from '@/lib/supabase';
import type { Attendance } from '@/types';

export async function getAttendances(date?: string, page = 0, pageSize = 20) {
  try {
    let query = supabase
      .from('attendances')
      .select('*, patient:patients(full_name)')
      .order('attendance_date', { ascending: false })
      .order('attendance_time', { ascending: false });

    if (date) {
      query = query.eq('attendance_date', date);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;
    if (error) throw error;

    return { data: data as Attendance[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

export async function createAttendance(input: Omit<Attendance, 'id' | 'created_at' | 'updated_at' | 'doctor_id'>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('attendances')
      .insert({ ...input, doctor_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return { data: data as Attendance, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function deleteAttendance(id: string) {
  try {
    const { error } = await supabase.from('attendances').delete().eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateAttendance(id: string, input: Partial<Omit<Attendance, 'id' | 'created_at' | 'updated_at' | 'doctor_id'>>) {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Attendance, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}
