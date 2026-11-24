import { supabase } from '@/lib/supabase';
import { computeOccurrenceDates, needsTopUp } from '@/lib/recurrence';
import type {
  Appointment,
  AppointmentSeries,
  AppointmentStatus,
  RecurrenceEndType,
  RecurrenceFrequency,
} from '@/types';

export interface AppointmentFilters {
  date?: string;
  patientId?: string;
  status?: AppointmentStatus;
}

export interface CreateAppointmentSeriesInput {
  patient_id: string;
  start_date: string;
  start_time: string;
  duration_minutes: number;
  frequency: RecurrenceFrequency;
  days_of_week: number[] | null;
  end_type: RecurrenceEndType;
  end_date: string | null;
  occurrences_count: number | null;
  notes: string | null;
}

const APPOINTMENT_SELECT = '*, patient:patients(full_name), series:appointment_series(frequency)';

export async function getAppointments(
  filters: AppointmentFilters = {},
  page = 0,
  pageSize = 20
): Promise<{ data: Appointment[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('doctor_id', user.id)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });

  if (filters.date) query = query.eq('appointment_date', filters.date);
  if (filters.patientId) query = query.eq('patient_id', filters.patientId);
  if (filters.status) query = query.eq('status', filters.status);

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data as Appointment[]) ?? [], error: null };
}

export async function getAppointmentById(id: string): Promise<{ data: Appointment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', id)
    .eq('doctor_id', user.id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Appointment, error: null };
}

/** Inserts a single appointment_series row, with no occurrence generation. Used by createAppointmentSeries and by offline sync replay. */
export async function createAppointmentSeriesRecord(
  input: CreateAppointmentSeriesInput
): Promise<{ data: AppointmentSeries | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('appointment_series')
    .insert({ ...input, doctor_id: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as AppointmentSeries, error: null };
}

export async function updateAppointmentSeries(
  id: string,
  input: Partial<Omit<AppointmentSeries, 'id' | 'created_at' | 'updated_at' | 'doctor_id'>>
): Promise<{ data: AppointmentSeries | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('appointment_series')
    .update(input)
    .eq('id', id)
    .eq('doctor_id', user.id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as AppointmentSeries, error: null };
}

/** Inserts a single appointment occurrence row. Used by offline sync replay (createAppointmentSeries bulk-inserts directly when online). */
export async function createAppointment(
  input: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'doctor_id' | 'status' | 'patient' | 'series'>
): Promise<{ data: Appointment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...input, doctor_id: user.id })
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Appointment, error: null };
}

export async function createAppointmentSeries(
  input: CreateAppointmentSeriesInput
): Promise<{ data: { series: AppointmentSeries; appointments: Appointment[] } | null; error: string | null }> {
  const { data: series, error: seriesError } = await createAppointmentSeriesRecord(input);
  if (seriesError || !series) return { data: null, error: seriesError };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const dates = computeOccurrenceDates({
    start_date: input.start_date,
    frequency: input.frequency,
    days_of_week: input.days_of_week,
    end_type: input.end_type,
    end_date: input.end_date,
    occurrences_count: input.occurrences_count,
  });

  if (dates.length === 0) {
    return { data: { series: series as AppointmentSeries, appointments: [] }, error: null };
  }

  const rows = dates.map((date) => ({
    doctor_id: user.id,
    patient_id: input.patient_id,
    series_id: series.id,
    appointment_date: date,
    appointment_time: input.start_time,
    duration_minutes: input.duration_minutes,
    notes: input.notes,
  }));

  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .insert(rows)
    .select(APPOINTMENT_SELECT);

  if (appointmentsError) return { data: null, error: appointmentsError.message };

  return {
    data: { series: series as AppointmentSeries, appointments: (appointments as Appointment[]) ?? [] },
    error: null,
  };
}

export async function updateAppointment(
  id: string,
  input: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'doctor_id' | 'series_id'>>
): Promise<{ data: Appointment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('appointments')
    .update(input)
    .eq('id', id)
    .eq('doctor_id', user.id)
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Appointment, error: null };
}

export async function deleteAppointment(id: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('doctor_id', user.id);
  if (error) return { error: error.message };
  return { error: null };
}

/** Statuses removed when a whole series is cancelled; completed/no-show visits are kept as history. */
export const SERIES_CANCEL_DELETABLE_STATUSES: AppointmentStatus[] = ['scheduled', 'cancelled'];

/**
 * Cancels a recurring series by deleting its upcoming (and already-cancelled)
 * appointments rather than keeping them around as 'cancelled' rows. The series
 * row itself is deleted when nothing references it any more; otherwise it's
 * marked 'cancelled' so the ongoing-series generator stops — it can't be
 * deleted then, because appointments.series_id cascades and would take the
 * completed history with it.
 */
export async function cancelAppointmentSeries(seriesId: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error: deleteError } = await supabase
    .from('appointments')
    .delete()
    .eq('series_id', seriesId)
    .eq('doctor_id', user.id)
    .in('status', SERIES_CANCEL_DELETABLE_STATUSES);
  if (deleteError) return { error: deleteError.message };

  const { count, error: countError } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('series_id', seriesId)
    .eq('doctor_id', user.id);
  if (countError) return { error: countError.message };

  const seriesQuery = supabase.from('appointment_series');
  const { error: seriesError } = count === 0
    ? await seriesQuery.delete().eq('id', seriesId).eq('doctor_id', user.id)
    : await seriesQuery.update({ status: 'cancelled' }).eq('id', seriesId).eq('doctor_id', user.id);
  if (seriesError) return { error: seriesError.message };

  return { error: null };
}

/**
 * Generates the next batch of occurrences for any 'ongoing' series running low
 * on future appointments. There's no backend cron in this project, so this is
 * called opportunistically (e.g. when the appointments list screen loads).
 */
export async function topUpSeriesIfNeeded(): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: ongoingSeries, error: seriesError } = await supabase
    .from('appointment_series')
    .select('*')
    .eq('doctor_id', user.id)
    .eq('status', 'active')
    .eq('end_type', 'ongoing');
  if (seriesError) return { error: seriesError.message };
  if (!ongoingSeries || ongoingSeries.length === 0) return { error: null };

  for (const series of ongoingSeries as AppointmentSeries[]) {
    const { data: latest } = await supabase
      .from('appointments')
      .select('appointment_date')
      .eq('series_id', series.id)
      .order('appointment_date', { ascending: false })
      .limit(1);

    const lastDate: string | null = latest && latest.length > 0 ? latest[0].appointment_date : null;
    if (!needsTopUp(series, lastDate ? [lastDate] : [])) continue;

    const fromDate = lastDate
      ? new Date(new Date(lastDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : series.start_date;

    const newDates = computeOccurrenceDates(
      {
        start_date: series.start_date,
        frequency: series.frequency,
        days_of_week: series.days_of_week,
        end_type: series.end_type,
        end_date: series.end_date,
        occurrences_count: series.occurrences_count,
      },
      { from: fromDate }
    );

    if (newDates.length === 0) continue;

    const rows = newDates.map((date) => ({
      doctor_id: user.id,
      patient_id: series.patient_id,
      series_id: series.id,
      appointment_date: date,
      appointment_time: series.start_time,
      duration_minutes: series.duration_minutes,
      notes: series.notes,
    }));

    await supabase.from('appointments').insert(rows);
  }

  return { error: null };
}
