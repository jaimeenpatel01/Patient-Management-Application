/**
 * dashboardService.offline.ts
 *
 * Drop-in replacement for getDashboardStats.
 * When offline, computes stats from cached patients + payments.
 */

import * as dashboardService from '@/services/dashboardService';
import type { DashboardStats, DashboardFilter } from '@/services/dashboardService';
import type { Patient, Payment } from '@/types';
import { getIsOnline } from '@/lib/networkState';
import * as offlineCache from '@/lib/offlineCache';

export type { DashboardStats, DashboardFilter };
export type { OverviewStats, PaymentStats } from '@/services/dashboardService';

function getDateRange(filter: DashboardFilter): { startStr: string; endStr: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (filter === 'weekly') start.setDate(now.getDate() - 6);
  else if (filter === 'monthly') start.setDate(now.getDate() - 29);

  const fmt = (d: Date) =>
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0');

  return { startStr: fmt(start), endStr: fmt(end) };
}

function computeStatsFromCache(
  patients: Patient[],
  payments: Payment[],
): DashboardStats {
  const totalPatients = patients.length;
  const activePatients = patients.filter((p) => p.is_active).length;

  const filters: DashboardFilter[] = ['daily', 'weekly', 'monthly'];
  const stats = {} as DashboardStats;

  const enriched = payments.map((p) => ({
    ...p,
    createdStr: p.created_at.split('T')[0],
    paidStr: p.payment_date?.split('T')[0],
  }));

  for (const filter of filters) {
    const { startStr, endStr } = getDateRange(filter);

    let collected = 0;
    let pending = 0;
    const paymentPatients = new Set<string>();

    for (const p of enriched) {
      const inCreated = p.createdStr >= startStr && p.createdStr <= endStr;
      const inPaid = p.paidStr && p.paidStr >= startStr && p.paidStr <= endStr;

      if (p.status === 'paid' && (inPaid || inCreated)) {
        collected += p.amount;
        paymentPatients.add(p.patient_id);
      } else if (
        (p.status === 'pending' || p.status === 'partially_paid') &&
        inCreated
      ) {
        pending += p.amount;
        paymentPatients.add(p.patient_id);
      }
    }

    stats[filter] = {
      overview: { activePatients, totalPatients, collected, pending },
      payment: {
        totalPatients: paymentPatients.size,
        revenue: collected,
        outstanding: pending,
      },
    };
  }

  return stats;
}

export async function getDashboardStats(): Promise<{
  data: DashboardStats | null;
  error: string | null;
}> {
  if (getIsOnline()) {
    try {
      return await dashboardService.getDashboardStats();
    } catch {
      // Fall through to offline computation
    }
  }

  // Offline: compute from cached data
  const [patients, payments] = await Promise.all([
    offlineCache.getCollection<Patient>('patients'),
    offlineCache.getCollection<Payment>('payments'),
  ]);

  const stats = computeStatsFromCache(patients ?? [], payments ?? []);
  return { data: stats, error: null };
}
