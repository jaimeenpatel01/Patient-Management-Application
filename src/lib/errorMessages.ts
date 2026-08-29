/**
 * Maps raw backend / SDK error strings to user-friendly messages.
 *
 * Keep messages:
 * - Short enough for a toast
 * - Clear about what happened
 * - Actionable when possible
 * - Free of backend / SDK terminology
 */

// ── Mapping table ──────────────────────────────────────────────────────────────

const ERROR_MAP: Array<{ pattern: string; message: string }> = [
  // ── Google Sign-In ─────────────────────────────────────────────────────────

  {
    pattern: 'DEVELOPER_ERROR',
    message: 'Google Sign-In is currently unavailable. Please try again later.',
  },
  {
    pattern: 'SIGN_IN_REQUIRED',
    message: 'Please sign in with your Google account to continue.',
  },
  {
    pattern: 'NETWORK_ERROR',
    message: 'Google Sign-In is having trouble connecting. Please try again.',
  },
  {
    pattern: 'play services',
    message: 'Google services are unavailable. Please update Google Play Services and try again.',
  },
  {
    pattern: 'Google Sign-In requires a development build',
    message: 'Google Sign-In is currently unavailable. Please try again later.',
  },
  {
    pattern: 'canceled',
    message: 'Google Sign-In was canceled.',
  },
  {
    pattern: 'cancelled',
    message: 'Google Sign-In was canceled.',
  },

  // ── Supabase Auth ──────────────────────────────────────────────────────────

  {
    pattern: 'Invalid login credentials',
    message: 'Incorrect email or password. Please try again.',
  },
  {
    pattern: 'Email not confirmed',
    message: 'Please verify your email address before signing in.',
  },
  {
    pattern: 'User already registered',
    message: 'An account with this email already exists. Please sign in instead.',
  },
  {
    pattern: 'Password should be at least',
    message: 'Password must be at least 6 characters long.',
  },
  {
    pattern: 'Email rate limit exceeded',
    message: 'Too many attempts. Please wait a moment and try again.',
  },
  {
    pattern: 'For security purposes, you can only request this after',
    message: 'Please wait a moment before requesting another code.',
  },
  {
    pattern: 'Token has expired or is invalid',
    message: 'Your verification code has expired. Please request a new one.',
  },
  {
    pattern: 'otp_expired',
    message: 'Your verification code has expired. Please request a new one.',
  },
  {
    pattern: 'New password should be different',
    message: 'Your new password must be different from your current password.',
  },
  {
    pattern: 'Auth session missing',
    message: 'Your session has expired. Please sign in again.',
  },
  {
    pattern: 'JWT expired',
    message: 'Your session has expired. Please sign in again.',
  },
  {
    pattern: 'refresh_token_not_found',
    message: 'Your session has expired. Please sign in again.',
  },

  // ── Network / Connectivity ────────────────────────────────────────────────

  {
    pattern: 'Failed to fetch',
    message: 'Unable to connect to the server. Please check your internet connection.',
  },
  {
    pattern: 'Network request failed',
    message: 'No internet connection. Please check your network and try again.',
  },
  {
    pattern: 'ERR_NETWORK',
    message: 'Network connection failed. Please try again.',
  },
  {
    pattern: 'timeout',
    message: 'The request took too long. Please try again.',
  },
  {
    pattern: 'timed out',
    message: 'The request took too long. Please try again.',
  },

  // ── Storage / Upload ──────────────────────────────────────────────────────

  {
    pattern: 'Payload too large',
    message: 'The file is too large. Please choose a smaller file.',
  },
  {
    pattern: 'The resource already exists',
    message: 'This file already exists. Please choose a different name.',
  },

  // ── Database / Supabase ───────────────────────────────────────────────────

  {
    pattern: 'duplicate key value violates unique constraint',
    message: 'This record already exists.',
  },
  {
    pattern: 'violates row-level security policy',
    message: 'You don’t have permission to perform this action.',
  },
  {
    pattern: 'Not authenticated',
    message: 'Please sign in to continue.',
  },

  // ── Common server errors ───────────────────────────────────────────────────

  {
    pattern: 'Internal Server Error',
    message: 'Something went wrong on our end. Please try again later.',
  },
  {
    pattern: '500',
    message: 'Something went wrong on our end. Please try again later.',
  },
  {
    pattern: '503',
    message: 'The service is temporarily unavailable. Please try again later.',
  },
  {
    pattern: 'Service Unavailable',
    message: 'The service is temporarily unavailable. Please try again later.',
  },
];

// ── Generic fallback ──────────────────────────────────────────────────────────

const GENERIC_FALLBACK = 'Something went wrong. Please try again.';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Convert a raw error string from any SDK / backend into a user-friendly
 * message suitable for a toast or alert.
 *
 * Known errors are mapped to friendly messages.
 * Unknown technical errors fall back to a generic message.
 */
export function getReadableError(
  rawError: string | null | undefined
): string {
  if (!rawError) {
    return GENERIC_FALLBACK;
  }

  const lower = rawError.toLowerCase();

  // Check known error mappings first
  for (const entry of ERROR_MAP) {
    if (lower.includes(entry.pattern.toLowerCase())) {
      return entry.message;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Pass through short, genuinely human-readable messages.
  //
  // Do NOT expose:
  // - URLs
  // - SDK error codes
  // - database errors
  // - stack traces
  // - technical identifiers
  // ─────────────────────────────────────────────────────────────────────────

  const looksReadable =
    rawError.length < 100 &&
    !rawError.includes('http') &&
    !rawError.includes('://') &&
    !/[A-Z_]{4,}/.test(rawError) &&
    !/[{}[\]]/.test(rawError) &&
    !rawError.includes('Error:');

  return looksReadable ? rawError : GENERIC_FALLBACK;
}