import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { daysRemaining, getEffectiveTier, getPatientCap, hasFeature, isTrialActive } from '@/lib/subscription';
import type { FeatureKey } from '@/types';

export function useSubscription() {
  const { subscription, billingSettings, refreshSubscription } = useAuth();

  return useMemo(() => {
    const now = new Date();
    const tier = getEffectiveTier(subscription, now);
    return {
      subscription,
      billingSettings,
      refreshSubscription,
      tier,
      isPro: tier === 'pro',
      isTrialing: isTrialActive(subscription, now),
      daysLeft: daysRemaining(subscription, now),
      patientCap: getPatientCap(tier, billingSettings.free_patient_cap),
      hasFeature: (key: FeatureKey) => hasFeature(tier, key),
    };
  }, [subscription, billingSettings, refreshSubscription]);
}
