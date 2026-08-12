import { supabase } from '@/lib/supabase';
import type { Payment, PaymentStatus, Patient } from '@/types';

export type PaymentWithPatient = Payment & {
  patient: Pick<Patient, 'full_name' | 'phone'>;
};

// ─── Fetch payments for a doctor ────────────────────────────────

export async function getPayments(): Promise<{ data: PaymentWithPatient[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      patient:patients(full_name, phone)
    `)
    .eq('doctor_id', user.id)
    .order('payment_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  // Note: PostgREST returns a single object for one-to-many relationships if it's actually many-to-one, 
  // but typed as array by some clients if not single(). 
  // The type of patient will be correctly inferred if we handle it as a single object per payment.
  return { data: (data as any) as PaymentWithPatient[], error: null };
}

// ─── Get Revenue Statistics ─────────────────────────────────────

export interface RevenueStats {
  totalPaid: number;
  totalPending: number;
  thisMonthPaid: number;
}

export async function getRevenueStatistics(): Promise<{ data: RevenueStats; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: { totalPaid: 0, totalPending: 0, thisMonthPaid: 0 }, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('payments')
    .select('amount, status, payment_date')
    .eq('doctor_id', user.id);

  if (error) return { data: { totalPaid: 0, totalPending: 0, thisMonthPaid: 0 }, error: error.message };

  const stats: RevenueStats = {
    totalPaid: 0,
    totalPending: 0,
    thisMonthPaid: 0,
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (const payment of data) {
    if (payment.status === 'paid') {
      stats.totalPaid += payment.amount;
      
      if (payment.payment_date) {
        const paymentDate = new Date(payment.payment_date);
        if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
          stats.thisMonthPaid += payment.amount;
        }
      } else {
        // If no payment_date, fallback to created_at logic or just ignore.
      }
    } else if (payment.status === 'pending' || payment.status === 'partially_paid') {
      stats.totalPending += payment.amount;
    }
  }

  return { data: stats, error: null };
}

// ─── Create a new payment ───────────────────────────────────────

export type CreatePaymentInput = Omit<Payment, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>;

export async function createPayment(input: CreatePaymentInput): Promise<{ data: Payment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...input,
      doctor_id: user.id,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Payment, error: null };
}

// ─── Update payment status ──────────────────────────────────────

export async function updatePaymentStatus(id: string, status: PaymentStatus): Promise<{ data: Payment | null; error: string | null }> {
  const { data, error } = await supabase
    .from('payments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Payment, error: null };
}
