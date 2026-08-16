/**
 * Shared formatting utilities.
 * Extracted from duplicated code across the app.
 */

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
