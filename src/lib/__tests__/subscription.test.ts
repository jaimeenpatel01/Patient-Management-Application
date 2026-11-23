import {
  daysRemaining,
  getEffectiveTier,
  getPatientCap,
  hasFeature,
  isTrialActive,
} from '@/lib/subscription';
import type { DoctorSubscription, SubscriptionPlan } from '@/types';

const NOW = new Date('2026-11-21T10:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const at = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();

const plan = (tier: 'free' | 'pro'): SubscriptionPlan => ({
  id: tier === 'free' ? 'free' : 'pro_monthly',
  tier,
  name: tier,
  billing_interval: tier === 'free' ? 'none' : 'monthly',
  price_inr: tier === 'free' ? 0 : 499,
  patient_cap: tier === 'free' ? 10 : null,
  is_active: true,
  sort_order: 0,
  created_at: '',
  updated_at: '',
});

const sub = (overrides: Partial<DoctorSubscription>): DoctorSubscription => ({
  id: 's1',
  doctor_id: 'd1',
  plan_id: 'pro_monthly',
  status: 'active',
  trial_ends_at: null,
  current_period_end: null,
  billing_provider: 'manual',
  provider_subscription_id: null,
  plan: plan('pro'),
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('getEffectiveTier', () => {
  it('is free with no subscription', () => {
    expect(getEffectiveTier(null, NOW)).toBe('free');
  });

  it('is free on the free plan', () => {
    expect(getEffectiveTier(sub({ plan_id: 'free', plan: plan('free') }), NOW)).toBe('free');
  });

  it('is pro during an active trial', () => {
    expect(getEffectiveTier(sub({ status: 'trialing', trial_ends_at: at(3) }), NOW)).toBe('pro');
  });

  it('is free once the trial has ended', () => {
    expect(getEffectiveTier(sub({ status: 'trialing', trial_ends_at: at(-1) }), NOW)).toBe('free');
  });

  it('is free for a trial with no end date', () => {
    expect(getEffectiveTier(sub({ status: 'trialing', trial_ends_at: null }), NOW)).toBe('free');
  });

  it('is pro for an active paid period', () => {
    expect(getEffectiveTier(sub({ current_period_end: at(20) }), NOW)).toBe('pro');
  });

  it('is free after the paid period lapses', () => {
    expect(getEffectiveTier(sub({ current_period_end: at(-0.01) }), NOW)).toBe('free');
  });

  it('is pro for an active pro plan with no end date', () => {
    expect(getEffectiveTier(sub({ current_period_end: null }), NOW)).toBe('pro');
  });

  it.each(['expired', 'cancelled'] as const)('is free when %s', (status) => {
    expect(getEffectiveTier(sub({ status, current_period_end: at(20) }), NOW)).toBe('free');
  });

  it('is free when the plan join is missing', () => {
    expect(getEffectiveTier(sub({ plan: null, current_period_end: at(20) }), NOW)).toBe('free');
  });
});

describe('isTrialActive', () => {
  it('is true only while trialing before the end date', () => {
    expect(isTrialActive(sub({ status: 'trialing', trial_ends_at: at(1) }), NOW)).toBe(true);
    expect(isTrialActive(sub({ status: 'trialing', trial_ends_at: at(-1) }), NOW)).toBe(false);
    expect(isTrialActive(sub({ status: 'active', current_period_end: at(1) }), NOW)).toBe(false);
    expect(isTrialActive(null, NOW)).toBe(false);
  });
});

describe('hasFeature', () => {
  it('locks every gated feature on free and unlocks it on pro', () => {
    const keys = ['unlimited_patients', 'business_reports', 'export_data', 'waitlist', 'exercise_media', 'gst_invoices', 'calendar_export'] as const;
    keys.forEach((key) => {
      expect(hasFeature('free', key)).toBe(false);
      expect(hasFeature('pro', key)).toBe(true);
    });
  });
});

describe('getPatientCap', () => {
  it('caps free at the configured limit and leaves pro unlimited', () => {
    expect(getPatientCap('free', 10)).toBe(10);
    expect(getPatientCap('free', 25)).toBe(25);
    expect(getPatientCap('pro', 10)).toBeNull();
  });
});

describe('daysRemaining', () => {
  it('rounds partial days up during a trial', () => {
    expect(daysRemaining(sub({ status: 'trialing', trial_ends_at: at(13.2) }), NOW)).toBe(14);
  });

  it('counts down to the paid period end', () => {
    expect(daysRemaining(sub({ current_period_end: at(30) }), NOW)).toBe(30);
  });

  it('is null when not pro or when there is no end date', () => {
    expect(daysRemaining(null, NOW)).toBeNull();
    expect(daysRemaining(sub({ status: 'trialing', trial_ends_at: at(-1) }), NOW)).toBeNull();
    expect(daysRemaining(sub({ current_period_end: null }), NOW)).toBeNull();
  });
});
