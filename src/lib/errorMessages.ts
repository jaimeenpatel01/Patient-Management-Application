/**
 * Maps raw backend / SDK error strings to user-friendly messages.
 *
 * Add new entries to `ERROR_MAP` when you encounter a new raw error that
 * should be shown differently to the user.
 */

// ── Mapping table ──────────────────────────────────────────────────────────────
// Keys are matched case-insensitively against the raw error string using
// `String.includes`, so partial matches work fine.

const ERROR_MAP: Array<{ pattern: string; message: string }> = [
  // ── Google Sign-In ──────────────────────────────────────────
  {
    pattern: 'DEVELOPER_ERROR',
    message: 'Google Sign-In is temporarily unavailable. Please try signing in with email.',
  },
  {
    pattern: 'SIGN_IN_REQUIRED',
    message: 'Please sign in with your Google account to continue.',
  },
  {
    pattern: 'NETWORK_ERROR',
    message: 'Network error. Please check your internet connection and try again.',
  },
  {
    pattern: 'play services',
    message: 'Google Play Services is required for Google Sign-In. Please update or install it.',
  },
  {
    pattern: 'Google Sign-In requires a development build',
    message: 'Google Sign-In is not available in this build. Please use email login.',
  },

  // ── Supabase Auth ───────────────────────────────────────────
  {
    pattern: 'Invalid login credentials',
    message: 'Incorrect email or password. Please try again.',
  },
  {
    pattern: 'Email not confirmed',
    message: 'Please verify your email address before signing in. Check your inbox.',
  },
  {
    pattern: 'User already registered',
    message: 'An account with this email already exists. Try signing in instead.',
  },
  {
    pattern: 'Password should be at least',
    message: 'Password must be at least 6 characters long.',
  },
  {
    pattern: 'Email rate limit exceeded',
    message: 'Too many attempts. Please wait a moment before trying again.',
  },
  {
    pattern: 'For security purposes, you can only request this after',
    message: 'Please wait a moment before requesting another code.',
  },
  {
    pattern: 'Token has expired or is invalid',
    message: 'The verification code has expired. Please request a new one.',
  },
  {
    pattern: 'otp_expired',
    message: 'The verification code has expired. Please request a new one.',
  },
  {
    pattern: 'New password should be different',
    message: 'Your new password must be different from the current one.',
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

  // ── Network / connectivity ──────────────────────────────────
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
    message: 'Network error. Please check your connection and try again.',
  },
  {
    pattern: 'timeout',
    message: 'The request timed out. Please try again.',
  },

  // ── Storage / upload ────────────────────────────────────────
  {
    pattern: 'Payload too large',
    message: 'The file is too large. Please choose a smaller file.',
  },
  {
    pattern: 'The resource already exists',
    message: 'This file already exists. Please rename it or delete the existing one.',
  },

  // ── Generic Supabase / Postgres ─────────────────────────────
  {
    pattern: 'duplicate key value violates unique constraint',
    message: 'This record already exists.',
  },
  {
    pattern: 'violates row-level security policy',
    message: 'You don\'t have permission to perform this action.',
  },
  {
    pattern: 'Not authenticated',
    message: 'Please sign in to continue.',
  },
];

// ── Public API ─────────────────────────────────────────────────────────────────

const GENERIC_FALLBACK = 'Something went wrong. Please try again.';

/**
 * Convert a raw error string from any SDK / backend into a user-friendly
 * message suitable for display in a toast or alert.
 *
 * If the error matches a known pattern, the mapped message is returned.
 * Otherwise a clean generic fallback is used.
 */
export function getReadableError(rawError: string | null | undefined): string {
  if (!rawError) return GENERIC_FALLBACK;

  const lower = rawError.toLowerCase();

  for (const entry of ERROR_MAP) {
    if (lower.includes(entry.pattern.toLowerCase())) {
      return entry.message;
    }
  }

  // If it's already a short, human-readable sentence (not a code/URL), pass it through.
  // Heuristic: no URLs, no SCREAMING_CASE, and reasonably short.
  const looksReadable =
    rawError.length < 120 &&
    !rawError.includes('http') &&
    !rawError.includes('://') &&
    !/[A-Z_]{4,}/.test(rawError);

  return looksReadable ? rawError : GENERIC_FALLBACK;
}
