/**
 * Unit tests for src/lib/recurrence.ts
 *
 * Pure date-math — no mocks needed. Covers each frequency, both hard end
 * conditions, the windowed/capped behavior of 'ongoing' series, and needsTopUp.
 */

import { computeOccurrenceDates, needsTopUp } from '@/lib/recurrence';
import type { RecurrenceRule } from '@/lib/recurrence';

function baseRule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    start_date: '2024-01-01',
    frequency: 'daily',
    days_of_week: null,
    end_type: 'occurrences',
    end_date: null,
    occurrences_count: 5,
    ...overrides,
  };
}

describe('computeOccurrenceDates', () => {
  it('one_off always returns a single date, ignoring end conditions', () => {
    const dates = computeOccurrenceDates(
      baseRule({ frequency: 'one_off', start_date: '2024-05-10', occurrences_count: 10 })
    );
    expect(dates).toEqual(['2024-05-10']);
  });

  it('daily generates consecutive days up to occurrences_count', () => {
    const dates = computeOccurrenceDates(baseRule({ frequency: 'daily', occurrences_count: 5 }));
    expect(dates).toEqual(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']);
  });

  it('daily stops at end_date (inclusive)', () => {
    const dates = computeOccurrenceDates(
      baseRule({ frequency: 'daily', start_date: '2024-03-01', end_type: 'end_date', end_date: '2024-03-05', occurrences_count: null })
    );
    expect(dates).toEqual(['2024-03-01', '2024-03-02', '2024-03-03', '2024-03-04', '2024-03-05']);
  });

  it('weekly on specific weekdays starts counting from the series start date', () => {
    // 2024-01-01 is a Monday.
    const dates = computeOccurrenceDates(
      baseRule({ frequency: 'weekly', days_of_week: [1, 3, 5], occurrences_count: 6 })
    );
    expect(dates).toEqual(['2024-01-01', '2024-01-03', '2024-01-05', '2024-01-08', '2024-01-10', '2024-01-12']);
  });

  it('biweekly only keeps every other week', () => {
    const dates = computeOccurrenceDates(
      baseRule({ frequency: 'biweekly', days_of_week: [1, 3, 5], occurrences_count: 6 })
    );
    expect(dates).toEqual(['2024-01-01', '2024-01-03', '2024-01-05', '2024-01-15', '2024-01-17', '2024-01-19']);
  });

  it('monthly repeats on the same day-of-month, clamping to shorter months', () => {
    const dates = computeOccurrenceDates(
      baseRule({ frequency: 'monthly', start_date: '2024-01-31', occurrences_count: 3 })
    );
    // 2024 is a leap year, so Feb clamps to the 29th, then March has a 31st again.
    expect(dates).toEqual(['2024-01-31', '2024-02-29', '2024-03-31']);
  });

  it('ongoing series respects an explicit windowEnd/maxCount override', () => {
    const dates = computeOccurrenceDates(
      baseRule({ frequency: 'daily', end_type: 'ongoing', occurrences_count: null }),
      { windowEnd: new Date(Date.UTC(2024, 0, 10)), maxCount: 5 }
    );
    expect(dates).toEqual(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']);
  });

  it('ongoing series without options is capped by the default batch size', () => {
    const dates = computeOccurrenceDates(
      baseRule({ frequency: 'daily', start_date: '2000-01-01', end_type: 'ongoing', occurrences_count: null })
    );
    expect(dates.length).toBe(60);
    expect(dates[0]).toBe('2000-01-01');
  });

  it('from option skips already-generated dates when topping up', () => {
    const dates = computeOccurrenceDates(
      baseRule({ frequency: 'daily', end_type: 'ongoing', occurrences_count: null }),
      { from: '2024-01-04', windowEnd: new Date(Date.UTC(2024, 0, 10)), maxCount: 10 }
    );
    expect(dates).toEqual(['2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07', '2024-01-08', '2024-01-09', '2024-01-10']);
  });
});

describe('needsTopUp', () => {
  it('is true for an active ongoing series with no generated dates yet', () => {
    expect(needsTopUp({ status: 'active', end_type: 'ongoing' }, [])).toBe(true);
  });

  it('is false once the last generated date is far in the future', () => {
    expect(needsTopUp({ status: 'active', end_type: 'ongoing' }, ['2099-01-01'])).toBe(false);
  });

  it('is true when the last generated date is within the next 14 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    const soonIso = soon.toISOString().split('T')[0];
    expect(needsTopUp({ status: 'active', end_type: 'ongoing' }, [soonIso])).toBe(true);
  });

  it('is false for a cancelled series regardless of dates', () => {
    expect(needsTopUp({ status: 'cancelled', end_type: 'ongoing' }, [])).toBe(false);
  });

  it('is false for a series that is not ongoing', () => {
    expect(needsTopUp({ status: 'active', end_type: 'occurrences' }, [])).toBe(false);
  });
});
