import { supabase } from '@/lib/supabase';
import type { WaitlistEntry, WaitlistStatus } from '@/types';

// ─── Fetch waitlist entries for the current doctor ────────────

export async function getWaitlist(status?: WaitlistStatus | 'all'): Promise<{ data: WaitlistEntry[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  let query = supabase
    .from('waitlist')
    .select('*, patient:patients(full_name, phone)')
    .eq('doctor_id', user.id);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as WaitlistEntry[]) ?? [], error: null };
}

// ─── Create a new waitlist entry ───────────────────────────────

export type CreateWaitlistInput = Omit<WaitlistEntry, 'id' | 'doctor_id' | 'status' | 'patient' | 'created_at' | 'updated_at'>;

export async function createWaitlistEntry(input: CreateWaitlistInput): Promise<{ data: WaitlistEntry | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('waitlist')
    .insert({
      ...input,
      doctor_id: user.id,
    })
    .select('*, patient:patients(full_name, phone)')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as WaitlistEntry, error: null };
}

// ─── Update the status of a waitlist entry ─────────────────────

export async function updateWaitlistStatus(id: string, status: WaitlistStatus): Promise<{ data: WaitlistEntry | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('waitlist')
    .update({ status })
    .eq('id', id)
    .eq('doctor_id', user.id)
    .select('*, patient:patients(full_name, phone)')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as WaitlistEntry, error: null };
}

// ─── Delete a waitlist entry ────────────────────────────────────

export async function deleteWaitlistEntry(id: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('waitlist')
    .delete()
    .eq('id', id)
    .eq('doctor_id', user.id);

  if (error) return { error: error.message };
  return { error: null };
}
