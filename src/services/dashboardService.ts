import { supabase } from '@/lib/supabase';

export type DashboardFilter = 'daily' | 'weekly' | 'monthly';

export interface OverviewStats {
  appointments: number;
  patients: number;
  collected: number;
  pending: number;
}

export interface PaymentStats {
  totalPatients: number;
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
    const monthlyRange = getFilterDateRange('monthly');
    const monthlyStartStr = formatDate(monthlyRange.startDate);
    const monthlyEndStr = formatDate(monthlyRange.endDate);

    const { data: apps, error: appsError } = await supabase
      .from('appointments')
      .select('patient_id, appointment_date')
      .eq('doctor_id', user.id)
      .gte('appointment_date', monthlyStartStr)
      .lte('appointment_date', monthlyEndStr);
    
    if (appsError) throw new Error(appsError.message);

    // Fetch all payments to compute collected/pending dynamically
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status, created_at, payment_date')
      .eq('doctor_id', user.id);

    if (paymentsError) throw new Error(paymentsError.message);

    const filters: DashboardFilter[] = ['daily', 'weekly', 'monthly'];
    const stats: DashboardStats = {} as any;

    for (const filter of filters) {
      const range = getFilterDateRange(filter);
      const startStr = formatDate(range.startDate);
      const endStr = formatDate(range.endDate);

      const filterApps = apps?.filter(a => {
        const d = a.appointment_date.split('T')[0];
        return d >= startStr && d <= endStr;
      }) || [];
      const appointmentsCount = filterApps.length;
      const uniquePatientsCount = new Set(filterApps.map(a => a.patient_id)).size;

      let collected = 0;
      let pending = 0;

      for (const p of allPayments || []) {
        const createdStr = p.created_at.split('T')[0];
        const paidStr = p.payment_date?.split('T')[0];
        
        const inCreated = createdStr >= startStr && createdStr <= endStr;
        const inPaid = paidStr && paidStr >= startStr && paidStr <= endStr;

        if (p.status === 'paid' && (inPaid || inCreated)) {
          collected += p.amount;
        } else if ((p.status === 'pending' || p.status === 'partially_paid') && inCreated) {
          pending += p.amount;
        }
      }

      stats[filter] = {
        overview: {
          appointments: appointmentsCount,
          patients: uniquePatientsCount,
          collected: collected,
          pending: pending,
        },
        payment: {
          totalPatients: uniquePatientsCount,
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
