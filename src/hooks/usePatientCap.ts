import { useCallback } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { getPatients } from '@/services/offline/patientService.offline';

/** Resolves true when the doctor's plan has a patient cap and it's already reached. Uses the offline cache when offline. */
export function usePatientCap() {
  const { patientCap } = useSubscription();

  const isAtCap = useCallback(async (): Promise<boolean> => {
    if (patientCap === null) return false;
    const { data, error } = await getPatients('active');
    if (error) return false;
    return data.length >= patientCap;
  }, [patientCap]);

  return { patientCap, isAtCap };
}
