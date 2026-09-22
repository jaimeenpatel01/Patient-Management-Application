/**
 * Shared formatting utilities.
 * Extracted from duplicated code across the app.
 */

/**
 * Groups a list of items by a date string field, returning sorted SectionList sections.
 * @param items Array of objects with a date field
 * @param getDate Function to extract the date string (YYYY-MM-DD) from an item
 * @returns Sections sorted newest-first, with dates formatted as DD/MM/YYYY
 */
export function groupItemsByDate<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined
): { title: string; data: T[] }[] {
  const grouped = items.reduce((acc, item) => {
    const date = getDate(item) || 'Unknown Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, T[]>);

  return Object.keys(grouped)
    .sort((a, b) => (a < b ? 1 : -1))
    .map(date => {
      let formattedDate = date;
      if (date !== 'Unknown Date') {
        const parts = date.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      return { title: formattedDate, data: grouped[date] };
    });
}

/** Convert 24h time string "HH:MM" to 12h format "hh:MM AM/PM" */
export function formatTime12Hour(val: string): string {
  const [h, m] = val.split(':');
  if (!h || !m) return val;
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${String(hour).padStart(2, '0')}:${m} ${ampm}`;
}

/** Get up to 2-letter initials from a full name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Format a doctor's display name, prefixing "Dr." if not already present */
export function getDoctorDisplayName(fullName: string | null, email: string | undefined): string {
  let displayName = fullName || email?.split('@')[0] || 'Doctor';
  const lowerName = displayName.toLowerCase();
  if (!lowerName.startsWith('dr.') && !lowerName.startsWith('dr ')) {
    displayName = `Dr. ${displayName}`;
  }
  return displayName;
}
