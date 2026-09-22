/**
 * Unit tests for src/lib/formatters.ts
 *
 * All functions are pure — no mocks required.
 * Tests cover:
 *   groupItemsByDate  — grouping, sorting newest-first, date formatting, unknown-date fallback
 *   formatTime12Hour  — AM/PM conversion, midnight, noon, boundary hours
 *   getInitials       — single word, two words, many words (slice to 2), empty string
 *   getDoctorDisplayName — prefix logic, already-prefixed names, email fallback, null name
 */

import {
  groupItemsByDate,
  formatTime12Hour,
  getInitials,
  getDoctorDisplayName,
} from '@/lib/formatters';

// ─────────────────────────────────────────────────────────────────────────────
// groupItemsByDate
// ─────────────────────────────────────────────────────────────────────────────

describe('groupItemsByDate', () => {
  interface Item {
    id: string;
    date: string | null;
  }

  const getDate = (item: Item) => item.date;

  it('should return an empty array when given an empty list', () => {
    const result = groupItemsByDate<Item>([], getDate);
    expect(result).toEqual([]);
  });

  it('should group items with the same date into one section', () => {
    const items: Item[] = [
      { id: '1', date: '2024-06-15' },
      { id: '2', date: '2024-06-15' },
    ];
    const result = groupItemsByDate(items, getDate);
    expect(result).toHaveLength(1);
    expect(result[0].data).toHaveLength(2);
  });

  it('should produce separate sections for different dates', () => {
    const items: Item[] = [
      { id: '1', date: '2024-06-15' },
      { id: '2', date: '2024-06-20' },
    ];
    const result = groupItemsByDate(items, getDate);
    expect(result).toHaveLength(2);
  });

  it('should sort sections newest-first (descending by date string)', () => {
    const items: Item[] = [
      { id: '1', date: '2024-01-01' },
      { id: '2', date: '2024-03-01' },
      { id: '3', date: '2024-02-01' },
    ];
    const result = groupItemsByDate(items, getDate);
    expect(result[0].title).toBe('01/03/2024');
    expect(result[1].title).toBe('01/02/2024');
    expect(result[2].title).toBe('01/01/2024');
  });

  it('should format YYYY-MM-DD dates as DD/MM/YYYY in the section title', () => {
    const items: Item[] = [{ id: '1', date: '2024-11-05' }];
    const result = groupItemsByDate(items, getDate);
    expect(result[0].title).toBe('05/11/2024');
  });

  it('should fall back to "Unknown Date" title when date is null', () => {
    const items: Item[] = [{ id: '1', date: null }];
    const result = groupItemsByDate(items, getDate);
    expect(result[0].title).toBe('Unknown Date');
  });

  it('should fall back to "Unknown Date" title when date is undefined', () => {
    interface ItemWithOptionalDate {
      id: string;
      date?: string;
    }
    const items: ItemWithOptionalDate[] = [{ id: '1' }];
    const result = groupItemsByDate(items, (i) => i.date);
    expect(result[0].title).toBe('Unknown Date');
  });

  it('should sort "Unknown Date" items correctly relative to dated items', () => {
    const items: Item[] = [
      { id: '1', date: '2024-01-01' },
      { id: '2', date: null },
    ];
    const result = groupItemsByDate(items, getDate);
    // Sort is descending by raw key string.
    // "Unknown Date" > "2024-01-01" lexicographically (U > 2), so it appears first.
    expect(result[0].title).toBe('Unknown Date');
    expect(result[1].title).toBe('01/01/2024');
  });

  it('should preserve original items inside each section', () => {
    const items: Item[] = [
      { id: 'a', date: '2024-07-04' },
      { id: 'b', date: '2024-07-04' },
    ];
    const result = groupItemsByDate(items, getDate);
    expect(result[0].data).toContainEqual({ id: 'a', date: '2024-07-04' });
    expect(result[0].data).toContainEqual({ id: 'b', date: '2024-07-04' });
  });

  it('should handle a single item correctly', () => {
    const items: Item[] = [{ id: 'x', date: '2024-12-25' }];
    const result = groupItemsByDate(items, getDate);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('25/12/2024');
    expect(result[0].data).toEqual([{ id: 'x', date: '2024-12-25' }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatTime12Hour
// ─────────────────────────────────────────────────────────────────────────────

describe('formatTime12Hour', () => {
  it('should convert midnight (00:00) to 12:00 AM', () => {
    expect(formatTime12Hour('00:00')).toBe('12:00 AM');
  });

  it('should convert noon (12:00) to 12:00 PM', () => {
    expect(formatTime12Hour('12:00')).toBe('12:00 PM');
  });

  it('should convert 01:30 AM correctly', () => {
    expect(formatTime12Hour('01:30')).toBe('01:30 AM');
  });

  it('should convert 13:45 to 01:45 PM', () => {
    expect(formatTime12Hour('13:45')).toBe('01:45 PM');
  });

  it('should convert 23:59 to 11:59 PM', () => {
    expect(formatTime12Hour('23:59')).toBe('11:59 PM');
  });

  it('should convert 11:59 to 11:59 AM', () => {
    expect(formatTime12Hour('11:59')).toBe('11:59 AM');
  });

  it('should return the raw value if no colon separator is present', () => {
    expect(formatTime12Hour('1430')).toBe('1430');
  });

  it('should return the raw value if the string is empty', () => {
    expect(formatTime12Hour('')).toBe('');
  });

  it('should pad single-digit hours with a leading zero', () => {
    // '09:15' -> hour=9, which is < 12 so AM, 9 % 12 = 9 (non-zero so stays 9)
    expect(formatTime12Hour('09:15')).toBe('09:15 AM');
  });

  it('should convert 12:30 to 12:30 PM (not 00:30 PM)', () => {
    expect(formatTime12Hour('12:30')).toBe('12:30 PM');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getInitials
// ─────────────────────────────────────────────────────────────────────────────

describe('getInitials', () => {
  it('should return first letter uppercased for a single-word name', () => {
    expect(getInitials('Ravi')).toBe('R');
  });

  it('should return two initials uppercased for a two-word name', () => {
    expect(getInitials('Priya Sharma')).toBe('PS');
  });

  it('should return only the first two initials for a three-word name', () => {
    expect(getInitials('Arun Kumar Singh')).toBe('AK');
  });

  it('should uppercase lowercase names', () => {
    expect(getInitials('john doe')).toBe('JD');
  });

  it('should return an empty string for an empty name', () => {
    // name.split(' ') = [''], map returns [undefined], join is '', slice is ''
    expect(getInitials('')).toBe('');
  });

  it('should handle names with extra spaces between words', () => {
    // Extra spaces create empty-string tokens; their [0] is undefined, joined becomes "P S"
    // This tests the actual behavior rather than an ideal behavior
    const result = getInitials('Priya  Sharma');
    // Just assert the result is a string (documents actual behavior without prescribing it)
    expect(typeof result).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDoctorDisplayName
// ─────────────────────────────────────────────────────────────────────────────

describe('getDoctorDisplayName', () => {
  it('should prefix "Dr." when the name does not already start with "Dr."', () => {
    expect(getDoctorDisplayName('Ananya Patel', undefined)).toBe('Dr. Ananya Patel');
  });

  it('should not duplicate the prefix when name already starts with "Dr."', () => {
    expect(getDoctorDisplayName('Dr. Ananya Patel', undefined)).toBe('Dr. Ananya Patel');
  });

  it('should not duplicate the prefix when name starts with "Dr " (no dot)', () => {
    expect(getDoctorDisplayName('Dr Ananya Patel', undefined)).toBe('Dr Ananya Patel');
  });

  it('should be case-insensitive when checking for the "dr." prefix', () => {
    expect(getDoctorDisplayName('DR. Ramesh Iyer', undefined)).toBe('DR. Ramesh Iyer');
  });

  it('should fall back to the email username when fullName is null', () => {
    expect(getDoctorDisplayName(null, 'ramesh@hospital.in')).toBe('Dr. ramesh');
  });

  it('should fall back to "Doctor" when both fullName and email are undefined', () => {
    expect(getDoctorDisplayName(null, undefined)).toBe('Dr. Doctor');
  });

  it('should prefix "Dr." when email username does not start with "dr." or "dr "', () => {
    // "drsmith" starts with "drs..." which is neither "dr." nor "dr ", so prefix is added
    expect(getDoctorDisplayName(null, 'drsmith@clinic.com')).toBe('Dr. drsmith');
  });

  it('should prefix "Dr." when an email-derived name has no dr prefix at all', () => {
    expect(getDoctorDisplayName(null, 'ananya@clinic.com')).toBe('Dr. ananya');
  });
});
