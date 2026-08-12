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
  overview: OverviewStats;
  payment: PaymentStats;
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

export async function getDashboardStats(
  overviewFilter: DashboardFilter,
  paymentFilter: DashboardFilter
): Promise<{ data: DashboardStats | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  try {
    const overviewRange = getFilterDateRange(overviewFilter);
    const paymentRange = getFilterDateRange(paymentFilter);
    
    const overviewStartStr = formatDate(overviewRange.startDate);
    const overviewEndStr = formatDate(overviewRange.endDate);
    
    const paymentStartStr = formatDate(paymentRange.startDate);
    const paymentEndStr = formatDate(paymentRange.endDate);

    // --- Overview Stats ---
    const { data: overviewApps, error: appsError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', user.id)
      .gte('appointment_date', overviewStartStr)
      .lte('appointment_date', overviewEndStr);
    
    if (appsError) throw new Error(appsError.message);

    const appointmentsCount = overviewApps?.length || 0;
    const uniquePatientsCount = new Set(overviewApps?.map(a => a.patient_id)).size;

    // Fetch all payments to compute collected/pending dynamically
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status, created_at, payment_date')
      .eq('doctor_id', user.id);

    if (paymentsError) throw new Error(paymentsError.message);

    let overviewCollected = 0;
    let overviewPending = 0;
    let paymentRevenue = 0;
    let paymentOutstanding = 0;

    for (const p of allPayments || []) {
      const createdStr = p.created_at.split('T')[0];
      const paidStr = p.payment_date?.split('T')[0];
      
      const inOverviewCreated = createdStr >= overviewStartStr && createdStr <= overviewEndStr;
      const inOverviewPaid = paidStr && paidStr >= overviewStartStr && paidStr <= overviewEndStr;

      if (p.status === 'paid' && (inOverviewPaid || inOverviewCreated)) {
        overviewCollected += p.amount;
      } else if ((p.status === 'pending' || p.status === 'partially_paid') && inOverviewCreated) {
        overviewPending += p.amount;
      }

      const inPaymentCreated = createdStr >= paymentStartStr && createdStr <= paymentEndStr;
      const inPaymentPaid = paidStr && paidStr >= paymentStartStr && paidStr <= paymentEndStr;

      if (p.status === 'paid' && (inPaymentPaid || inPaymentCreated)) {
        paymentRevenue += p.amount;
      } else if ((p.status === 'pending' || p.status === 'partially_paid') && inPaymentCreated) {
        paymentOutstanding += p.amount;
      }
    }

    // --- Payment Stats ---
    const { data: paymentApps, error: paymentAppsError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', user.id)
      .gte('appointment_date', paymentStartStr)
      .lte('appointment_date', paymentEndStr);

    if (paymentAppsError) throw new Error(paymentAppsError.message);
    const paymentUniquePatients = new Set(paymentApps?.map(a => a.patient_id)).size;

    const stats: DashboardStats = {
      overview: {
        appointments: appointmentsCount,
        patients: uniquePatientsCount,
        collected: overviewCollected,
        pending: overviewPending,
      },
      payment: {
        totalPatients: paymentUniquePatients,
        revenue: paymentRevenue,
        outstanding: paymentOutstanding,
      }
    };

    return { data: stats, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}
