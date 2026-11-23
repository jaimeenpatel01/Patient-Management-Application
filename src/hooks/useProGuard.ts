import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAlert } from '@/contexts/AlertContext';
import { useSubscription } from '@/hooks/useSubscription';
import { FEATURE_LABELS } from '@/lib/subscription';
import type { FeatureKey } from '@/types';

/** Returns a guard that runs `action` only if the feature is unlocked, otherwise offers an upgrade. */
export function useProGuard() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { hasFeature } = useSubscription();

  return useCallback(
    (key: FeatureKey, action: () => void) => {
      if (hasFeature(key)) {
        action();
        return;
      }
      showAlert(
        'Pro feature',
        `${FEATURE_LABELS[key]} is available on PhysioDesk Pro.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/profile/subscription' as any) },
        ],
      );
    },
    [hasFeature, showAlert, router],
  );
}
