import { supabase } from '@/lib/supabase';

export type DashboardFilter = 'daily' | 'weekly' | 'monthly';

export interface OverviewStats {
  activePatients: number;
  totalPatients: number;
  collected: number;
  pending: number;
}

export interface PaymentStats {
  totalPatients: number; // For backward compatibility in payment section
  revenue: number;
  outstanding: number;
}

export interface DashboardStats {
  daily: {
    overview: OverviewStats;
    payment: PaymentStats;
  };
  weekly: {
    overview: OverviewStats;
    payment: PaymentStats;
  };
  monthly: {
    overview: OverviewStats;
    payment: PaymentStats;
  };
}

function getFilterDateRange(filter: DashboardFilter): { startDate: Date, endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  if (filter === 'weekly') {
    startDate.setDate(now.getDate() - 6);
  } else if (filter === 'monthly') {
    startDate.setDate(now.getDate() - 29);
  }

  return { startDate, endDate };
}

function formatDate(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

export async function getDashboardStats(): Promise<{ data: DashboardStats | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  try {
    // 1. Fetch Global Patient Counts
    const { count: totalPatientsCount, error: totalErr } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', user.id);
    if (totalErr) throw new Error(totalErr.message);

    const { count: activePatientsCount, error: activeErr } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', user.id)
      .eq('is_active', true);
    if (activeErr) throw new Error(activeErr.message);

    // 2. Fetch Payments for all filters
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status, created_at, payment_date, patient_id')
      .eq('doctor_id', user.id);
    if (paymentsError) throw new Error(paymentsError.message);

    const filters: DashboardFilter[] = ['daily', 'weekly', 'monthly'];
    const stats: DashboardStats = {} as any;

    for (const filter of filters) {
      const range = getFilterDateRange(filter);
      const startStr = formatDate(range.startDate);
      const endStr = formatDate(range.endDate);

      let collected = 0;
      let pending = 0;
      let paymentPatients = new Set<string>();

      for (const p of allPayments || []) {
        const createdStr = p.created_at.split('T')[0];
        const paidStr = p.payment_date?.split('T')[0];
        
        const inCreated = createdStr >= startStr && createdStr <= endStr;
        const inPaid = paidStr && paidStr >= startStr && paidStr <= endStr;

        if (p.status === 'paid' && (inPaid || inCreated)) {
          collected += p.amount;
          paymentPatients.add(p.patient_id);
        } else if ((p.status === 'pending' || p.status === 'partially_paid') && inCreated) {
          pending += p.amount;
          paymentPatients.add(p.patient_id);
        }
      }

      stats[filter] = {
        overview: {
          activePatients: activePatientsCount || 0,
          totalPatients: totalPatientsCount || 0,
          collected: collected,
          pending: pending,
        },
        payment: {
          totalPatients: paymentPatients.size,
          revenue: collected,
          outstanding: pending,
        }
      };
    }

    return { data: stats, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}
