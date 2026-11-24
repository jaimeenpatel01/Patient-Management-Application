/**
 * Pure date-math for appointment recurrence. No Supabase dependency.
 */

import type { AppointmentSeries, RecurrenceEndType, RecurrenceFrequency } from '@/types';

export interface RecurrenceRule {
  start_date: string;
  frequency: RecurrenceFrequency;
  days_of_week: number[] | null;
  end_type: RecurrenceEndType;
  end_date: string | null;
  occurrences_count: number | null;
}

export interface ComputeOccurrencesOptions {
  /** Only emit dates on/after this ISO date — used when topping up an ongoing series. */
  from?: string;
  /** Don't emit dates after this point — defaults to a 90-day rolling window for 'ongoing' series. */
  windowEnd?: Date;
  /** Max dates to emit in this call — defaults to 60 for 'ongoing' series. */
  maxCount?: number;
}

const ONGOING_WINDOW_DAYS = 90;
const ONGOING_MAX_COUNT = 60;
/** Absolute safety limit on total occurrences generated for any single series. */
const HARD_CAP = 366;

function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const daysInMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, daysInMonth));
  return next;
}

/** Infinite (except one_off) stream of candidate dates for a frequency, in ascending order. */
function* candidateDates(rule: RecurrenceRule, seriesStart: Date): Generator<Date> {
  switch (rule.frequency) {
    case 'one_off': {
      yield seriesStart;
      return;
    }
    case 'daily': {
      let d = seriesStart;
      while (true) {
        yield d;
        d = addDays(d, 1);
      }
    }
    case 'monthly': {
      let i = 0;
      while (true) {
        yield addMonthsClamped(seriesStart, i);
        i += 1;
      }
    }
    case 'weekly':
    case 'biweekly': {
      const days = (rule.days_of_week && rule.days_of_week.length > 0
        ? rule.days_of_week
        : [seriesStart.getUTCDay()]
      ).slice().sort((a, b) => a - b);
      const baseWeekStart = addDays(seriesStart, -seriesStart.getUTCDay());
      let weekIndex = 0;
      while (true) {
        const skipWeek = rule.frequency === 'biweekly' && weekIndex % 2 === 1;
        if (!skipWeek) {
          const weekStart = addDays(baseWeekStart, weekIndex * 7);
          for (const dow of days) {
            yield addDays(weekStart, dow);
          }
        }
        weekIndex += 1;
      }
    }
  }
}

/**
 * Computes the ISO dates (YYYY-MM-DD) a recurrence rule produces, bounded by
 * end_date / occurrences_count / a windowed cap for 'ongoing' series.
 */
export function computeOccurrenceDates(rule: RecurrenceRule, options: ComputeOccurrencesOptions = {}): string[] {
  const seriesStart = parseISODate(rule.start_date);
  const cutoff = options.from ? parseISODate(options.from) : seriesStart;
  const hardEndDate = rule.end_type === 'end_date' && rule.end_date ? parseISODate(rule.end_date) : null;
  const occurrencesLimit = rule.end_type === 'occurrences' ? (rule.occurrences_count ?? 0) : null;
  const windowEnd = options.windowEnd ?? (rule.end_type === 'ongoing' ? addDays(new Date(), ONGOING_WINDOW_DAYS) : null);
  const batchLimit = rule.end_type === 'ongoing' ? (options.maxCount ?? ONGOING_MAX_COUNT) : Infinity;

  const result: string[] = [];
  let totalCount = 0;

  for (const candidate of candidateDates(rule, seriesStart)) {
    if (candidate < cutoff) continue;
    if (hardEndDate && candidate > hardEndDate) break;
    if (totalCount >= HARD_CAP) break;
    if (occurrencesLimit !== null && totalCount >= occurrencesLimit) break;

    totalCount += 1;

    if (windowEnd && candidate > windowEnd) break;
    if (result.length >= batchLimit) break;

    result.push(formatISODate(candidate));
  }

  return result;
}

/**
 * True when an 'ongoing' series is running low on generated future occurrences
 * and should be extended with another batch.
 */
export function needsTopUp(
  series: Pick<AppointmentSeries, 'status' | 'end_type'>,
  generatedDates: string[],
): boolean {
  if (series.status !== 'active' || series.end_type !== 'ongoing') return false;
  if (generatedDates.length === 0) return true;

  const lastDate = generatedDates.reduce((max, d) => (d > max ? d : max), generatedDates[0]);
  const topUpThreshold = addDays(new Date(), 14);
  return parseISODate(lastDate) < topUpThreshold;
}
