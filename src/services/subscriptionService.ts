import { supabase } from '@/lib/supabase';
import type { BillingSettings, DoctorSubscription, SubscriptionPayment, SubscriptionPlan } from '@/types';

// Online-only by design: a payment submission must fail loudly rather than sit in the sync queue.

export async function getMySubscription(doctorId: string): Promise<{ data: DoctorSubscription | null; error: string | null }> {
  const { data, error } = await supabase
    .from('doctor_subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('doctor_id', doctorId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as DoctorSubscription | null, error: null };
}

export async function getBillingSettings(): Promise<{ data: BillingSettings | null; error: string | null }> {
  const [settingsRes, freePlanRes] = await Promise.all([
    supabase
      .from('billing_settings')
      .select('upi_id, upi_payee_name, verification_sla_text, trial_days')
      .maybeSingle(),
    supabase.from('subscription_plans').select('patient_cap').eq('id', 'free').maybeSingle(),
  ]);

  const error = settingsRes.error ?? freePlanRes.error;
  if (error) return { data: null, error: error.message };
  if (!settingsRes.data || freePlanRes.data?.patient_cap == null) {
    return { data: null, error: 'Billing settings not found' };
  }
  return { data: { ...settingsRes.data, free_patient_cap: freePlanRes.data.patient_cap }, error: null };
}

export async function getPlans(): Promise<{ data: SubscriptionPlan[]; error: string | null }> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data as SubscriptionPlan[]) ?? [], error: null };
}

export interface SubmitPaymentInput {
  planId: string;
  amountInr: number;
  paymentReference: string;
  payerNote?: string;
}

export async function submitPayment(input: SubmitPaymentInput): Promise<{ data: SubscriptionPayment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('subscription_payments')
    .insert({
      doctor_id: user.id,
      plan_id: input.planId,
      amount_inr: input.amountInr,
      payment_reference: input.paymentReference.trim().toUpperCase(),
      payer_note: input.payerNote?.trim() || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as SubscriptionPayment, error: null };
}

export async function getPaymentHistory(): Promise<{ data: SubscriptionPayment[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as SubscriptionPayment[]) ?? [], error: null };
}

export async function getActivePatientCount(): Promise<{ data: number | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { count, error } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('doctor_id', user.id)
    .eq('is_active', true);

  if (error) return { data: null, error: error.message };
  return { data: count ?? 0, error: null };
}
