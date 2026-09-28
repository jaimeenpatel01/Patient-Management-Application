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
    // 1. Fetch Global Patient Counts and Payments in parallel
    const [
      { count: totalPatientsCount, error: totalErr },
      { count: activePatientsCount, error: activeErr },
      { data: allPayments, error: paymentsError },
    ] = await Promise.all([
      supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user.id),
      supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user.id)
        .eq('is_active', true),
      supabase
        .from('payments')
        .select('amount, status, created_at, payment_date, patient_id')
        .eq('doctor_id', user.id),
    ]);

    if (totalErr) throw new Error(totalErr.message);
    if (activeErr) throw new Error(activeErr.message);
    if (paymentsError) throw new Error(paymentsError.message);

    const filters: DashboardFilter[] = ['daily', 'weekly', 'monthly'];
    const stats = {} as DashboardStats;

    // Pre-compute date strings once per payment to avoid repeated string parsing in the inner loop
    const payments = (allPayments || []).map(p => ({
      ...p,
      createdStr: p.created_at.split('T')[0],
      paidStr: p.payment_date?.split('T')[0],
    }));

    for (const filter of filters) {
      const range = getFilterDateRange(filter);
      const startStr = formatDate(range.startDate);
      const endStr = formatDate(range.endDate);

      let collected = 0;
      let pending = 0;
      const paymentPatients = new Set<string>();

      for (const p of payments) {
        const inCreated = p.createdStr >= startStr && p.createdStr <= endStr;
        const inPaid = p.paidStr && p.paidStr >= startStr && p.paidStr <= endStr;

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
          collected,
          pending,
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

// ─── Revenue Trend (last N months) ─────────────────────────────

export interface MonthlyRevenuePoint {
  key: string;   // 'YYYY-MM'
  label: string; // 'Sep 2026'
  total: number;
}

export async function getRevenueTrend(monthsBack: number = 6): Promise<{ data: MonthlyRevenuePoint[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  try {
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_date, created_at')
      .eq('doctor_id', user.id)
      .eq('status', 'paid');

    if (error) throw new Error(error.message);

    // Build empty month buckets for the requested range, oldest first
    const buckets: MonthlyRevenuePoint[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      buckets.push({ key, label, total: 0 });
    }
    const bucketByKey = new Map(buckets.map(b => [b.key, b]));

    for (const p of data || []) {
      const dateStr = p.payment_date || p.created_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime()) || d < rangeStart) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketByKey.get(key);
      if (bucket) bucket.total += p.amount;
    }

    return { data: buckets, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

// ─── Patient Retention (new vs. returning this month) ──────────

export interface PatientRetentionStats {
  newPatients: number;
  returningPatients: number;
  totalActivePatients: number;
}

export async function getPatientRetentionStats(): Promise<{ data: PatientRetentionStats; error: string | null }> {
  const empty: PatientRetentionStats = { newPatients: 0, returningPatients: 0, totalActivePatients: 0 };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: empty, error: 'Not authenticated' };

  try {
    const { data, error } = await supabase
      .from('attendances')
      .select('patient_id, attendance_date')
      .eq('doctor_id', user.id);

    if (error) throw new Error(error.message);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Map of patient_id -> set of distinct 'YYYY-MM' months they were seen in
    const patientMonths = new Map<string, Set<string>>();
    for (const a of data || []) {
      if (!a.attendance_date || !a.patient_id) continue;
      const monthKey = a.attendance_date.slice(0, 7);
      const set = patientMonths.get(a.patient_id) ?? new Set<string>();
      set.add(monthKey);
      patientMonths.set(a.patient_id, set);
    }

    let newPatients = 0;
    let returningPatients = 0;
    for (const months of patientMonths.values()) {
      if (!months.has(currentMonthKey)) continue;
      const hasPriorMonth = Array.from(months).some(m => m < currentMonthKey);
      if (hasPriorMonth) returningPatients++;
      else newPatients++;
    }

    return {
      data: { newPatients, returningPatients, totalActivePatients: newPatients + returningPatients },
      error: null,
    };
  } catch (error: any) {
    return { data: empty, error: error.message };
  }
}

// ─── Attendance Patterns (this month) ───────────────────────────
// Note: attendances have no status/no-show column (see Attendance type),
// so this reports average sessions per patient and the most active
// patients this month instead of no-show rates.

export interface ActivePatientStat {
  patientId: string;
  fullName: string;
  sessionCount: number;
}

export interface AttendanceInsights {
  totalSessionsThisMonth: number;
  activePatientsThisMonth: number;
  averageSessionsPerPatient: number;
  topPatients: ActivePatientStat[];
}

export async function getAttendanceInsights(topN: number = 5): Promise<{ data: AttendanceInsights; error: string | null }> {
  const empty: AttendanceInsights = {
    totalSessionsThisMonth: 0,
    activePatientsThisMonth: 0,
    averageSessionsPerPatient: 0,
    topPatients: [],
  };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: empty, error: 'Not authenticated' };

  try {
    const now = new Date();
    const monthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const { data, error } = await supabase
      .from('attendances')
      .select('patient_id, attendance_date, patient:patients(full_name)')
      .eq('doctor_id', user.id)
      .gte('attendance_date', monthStart)
      .lte('attendance_date', monthEnd);

    if (error) throw new Error(error.message);

    const rows = (data || []) as unknown as { patient_id: string; patient: { full_name: string } | null }[];

    const counts = new Map<string, { fullName: string; count: number }>();
    for (const row of rows) {
      const existing = counts.get(row.patient_id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(row.patient_id, { fullName: row.patient?.full_name || 'Unknown', count: 1 });
      }
    }

    const totalSessionsThisMonth = rows.length;
    const activePatientsThisMonth = counts.size;
    const averageSessionsPerPatient = activePatientsThisMonth > 0
      ? totalSessionsThisMonth / activePatientsThisMonth
      : 0;

    const topPatients = Array.from(counts.entries())
      .map(([patientId, v]) => ({ patientId, fullName: v.fullName, sessionCount: v.count }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, topN);

    return {
      data: { totalSessionsThisMonth, activePatientsThisMonth, averageSessionsPerPatient, topPatients },
      error: null,
    };
  } catch (error: any) {
    return { data: empty, error: error.message };
  }
}

// ─── Top Diagnoses (this quarter) ───────────────────────────────

export interface DiagnosisFrequency {
  title: string;
  count: number;
}

export async function getTopDiagnoses(monthsBack: number = 3, limit: number = 8): Promise<{ data: DiagnosisFrequency[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  try {
    const now = new Date();
    const rangeStart = formatDate(new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1));

    const { data, error } = await supabase
      .from('diagnoses')
      .select('title, diagnosis_date')
      .eq('doctor_id', user.id)
      .gte('diagnosis_date', rangeStart);

    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    for (const d of data || []) {
      const key = (d.title || '').trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const result = Array.from(counts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return { data: result, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}
