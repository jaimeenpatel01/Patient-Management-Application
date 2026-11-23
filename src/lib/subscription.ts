import type { DoctorSubscription, FeatureKey, SubscriptionTier } from '@/types';

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, pro: 1 };

const FEATURE_MIN_TIER: Record<FeatureKey, SubscriptionTier> = {
  unlimited_patients: 'pro',
  business_reports: 'pro',
  export_data: 'pro',
  waitlist: 'pro',
  exercise_media: 'pro',
  gst_invoices: 'pro',
  calendar_export: 'pro',
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  unlimited_patients: 'Unlimited patients',
  business_reports: 'Business Reports',
  export_data: 'Data Export',
  waitlist: 'Waitlist',
  exercise_media: 'Exercise media attachments',
  gst_invoices: 'GST invoices',
  calendar_export: 'Calendar export',
};

const isFuture = (iso: string | null, now: Date) => !!iso && new Date(iso).getTime() > now.getTime();

/** Tier the doctor is entitled to right now; anything lapsed collapses to free.
 *  Mirrored in SQL by admin_subscription_state (supabase/migrations/015_admin_subscriptions.sql). */
export function getEffectiveTier(sub: DoctorSubscription | null, now: Date = new Date()): SubscriptionTier {
  if (!sub || sub.plan?.tier !== 'pro') return 'free';
  if (sub.status === 'trialing') return isFuture(sub.trial_ends_at, now) ? 'pro' : 'free';
  if (sub.status === 'active') {
    return sub.current_period_end === null || isFuture(sub.current_period_end, now) ? 'pro' : 'free';
  }
  return 'free';
}

export function isTrialActive(sub: DoctorSubscription | null, now: Date = new Date()): boolean {
  return sub?.status === 'trialing' && isFuture(sub.trial_ends_at, now);
}

export function hasFeature(tier: SubscriptionTier, key: FeatureKey): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[key]];
}

/** freePatientCap comes from the `free` plan's patient_cap (BillingSettings.free_patient_cap). */
export function getPatientCap(tier: SubscriptionTier, freePatientCap: number): number | null {
  return tier === 'free' ? freePatientCap : null;
}

/** Whole days until the trial or paid period ends (rounded up), or null if nothing is counting down. */
export function daysRemaining(sub: DoctorSubscription | null, now: Date = new Date()): number | null {
  if (getEffectiveTier(sub, now) !== 'pro') return null;
  const end = sub!.status === 'trialing' ? sub!.trial_ends_at : sub!.current_period_end;
  if (!end) return null;
  const ms = new Date(end).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
