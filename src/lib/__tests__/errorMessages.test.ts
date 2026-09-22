/**
 * Unit tests for src/lib/errorMessages.ts — getReadableError()
 *
 * Tests cover:
 *   - null / undefined / empty input → generic fallback
 *   - Each mapped error pattern (case-insensitive, substring match)
 *   - Pattern matching for Google Sign-In, Supabase Auth, Network, Storage, DB
 *   - Pass-through of short, genuinely human-readable messages
 *   - Suppression of technical garbage (URLs, SDK codes, stack traces, JSON)
 */

import { getReadableError } from '@/lib/errorMessages';

const GENERIC = 'Something went wrong. Please try again.';

describe('getReadableError', () => {
  // ── Null / empty input ──────────────────────────────────────────────────────

  describe('null, undefined, and empty input', () => {
    it('should return the generic fallback when rawError is null', () => {
      expect(getReadableError(null)).toBe(GENERIC);
    });

    it('should return the generic fallback when rawError is undefined', () => {
      expect(getReadableError(undefined)).toBe(GENERIC);
    });

    it('should return the generic fallback when rawError is an empty string', () => {
      expect(getReadableError('')).toBe(GENERIC);
    });
  });

  // ── Google Sign-In errors ───────────────────────────────────────────────────

  describe('Google Sign-In error patterns', () => {
    it('should map DEVELOPER_ERROR', () => {
      expect(getReadableError('DEVELOPER_ERROR')).toBe(
        'Google Sign-In is currently unavailable. Please try again later.'
      );
    });

    it('should map DEVELOPER_ERROR case-insensitively', () => {
      expect(getReadableError('developer_error occurred')).toBe(
        'Google Sign-In is currently unavailable. Please try again later.'
      );
    });

    it('should map SIGN_IN_REQUIRED', () => {
      expect(getReadableError('SIGN_IN_REQUIRED')).toBe(
        'Please sign in with your Google account to continue.'
      );
    });

    it('should map NETWORK_ERROR', () => {
      expect(getReadableError('NETWORK_ERROR: connection refused')).toBe(
        'Google Sign-In is having trouble connecting. Please try again.'
      );
    });

    it('should map "play services" (substring)', () => {
      expect(getReadableError('Google play services not available')).toBe(
        'Google services are unavailable. Please update Google Play Services and try again.'
      );
    });

    it('should map "Google Sign-In requires a development build"', () => {
      expect(
        getReadableError('Google Sign-In requires a development build to work')
      ).toBe('Google Sign-In is currently unavailable. Please try again later.');
    });

    it('should map "canceled" (US spelling)', () => {
      expect(getReadableError('Sign in was canceled by user')).toBe(
        'Google Sign-In was canceled.'
      );
    });

    it('should map "cancelled" (UK spelling)', () => {
      expect(getReadableError('Request cancelled')).toBe('Google Sign-In was canceled.');
    });
  });

  // ── Supabase Auth errors ────────────────────────────────────────────────────

  describe('Supabase Auth error patterns', () => {
    it('should map "Invalid login credentials"', () => {
      expect(getReadableError('Invalid login credentials')).toBe(
        'Incorrect email or password. Please try again.'
      );
    });

    it('should map "Email not confirmed"', () => {
      expect(getReadableError('Email not confirmed')).toBe(
        'Please verify your email address before signing in.'
      );
    });

    it('should map "User already registered"', () => {
      expect(getReadableError('User already registered')).toBe(
        'An account with this email already exists. Please sign in instead.'
      );
    });

    it('should map "Password should be at least"', () => {
      expect(getReadableError('Password should be at least 6 characters')).toBe(
        'Password must be at least 6 characters long.'
      );
    });

    it('should map "Email rate limit exceeded"', () => {
      expect(getReadableError('Email rate limit exceeded')).toBe(
        'Too many attempts. Please wait a moment and try again.'
      );
    });

    it('should map "For security purposes, you can only request this after"', () => {
      expect(
        getReadableError('For security purposes, you can only request this after 60 seconds')
      ).toBe('Please wait a moment before requesting another code.');
    });

    it('should map "Token has expired or is invalid"', () => {
      expect(getReadableError('Token has expired or is invalid')).toBe(
        'Your verification code has expired. Please request a new one.'
      );
    });

    it('should map "otp_expired"', () => {
      expect(getReadableError('otp_expired')).toBe(
        'Your verification code has expired. Please request a new one.'
      );
    });

    it('should map "New password should be different"', () => {
      expect(getReadableError('New password should be different from the old password')).toBe(
        'Your new password must be different from your current password.'
      );
    });

    it('should map "Auth session missing"', () => {
      expect(getReadableError('Auth session missing')).toBe(
        'Your session has expired. Please sign in again.'
      );
    });

    it('should map "JWT expired"', () => {
      expect(getReadableError('JWT expired')).toBe(
        'Your session has expired. Please sign in again.'
      );
    });

    it('should map "refresh_token_not_found"', () => {
      expect(getReadableError('refresh_token_not_found')).toBe(
        'Your session has expired. Please sign in again.'
      );
    });
  });

  // ── Network / connectivity errors ───────────────────────────────────────────

  describe('Network error patterns', () => {
    it('should map "Failed to fetch"', () => {
      expect(getReadableError('Failed to fetch')).toBe(
        'Unable to connect to the server. Please check your internet connection.'
      );
    });

    it('should map "Network request failed"', () => {
      expect(getReadableError('Network request failed')).toBe(
        'No internet connection. Please check your network and try again.'
      );
    });

    it('should map "ERR_NETWORK"', () => {
      expect(getReadableError('ERR_NETWORK')).toBe('Network connection failed. Please try again.');
    });

    it('should map "timeout"', () => {
      expect(getReadableError('connection timeout after 30s')).toBe(
        'The request took too long. Please try again.'
      );
    });

    it('should map "timed out"', () => {
      expect(getReadableError('request timed out')).toBe(
        'The request took too long. Please try again.'
      );
    });
  });

  // ── Storage / upload errors ─────────────────────────────────────────────────

  describe('Storage error patterns', () => {
    it('should map "Payload too large"', () => {
      expect(getReadableError('Payload too large')).toBe(
        'The file is too large. Please choose a smaller file.'
      );
    });

    it('should map "The resource already exists"', () => {
      expect(getReadableError('The resource already exists in storage')).toBe(
        'This file already exists. Please choose a different name.'
      );
    });
  });

  // ── Database / RLS errors ───────────────────────────────────────────────────

  describe('Database error patterns', () => {
    it('should map "duplicate key value violates unique constraint"', () => {
      expect(
        getReadableError('duplicate key value violates unique constraint "patients_pkey"')
      ).toBe('This record already exists.');
    });

    it('should map "violates row-level security policy"', () => {
      expect(getReadableError('new row violates row-level security policy for table')).toBe(
        'You don\u2019t have permission to perform this action.'
      );
    });

    it('should map "Not authenticated"', () => {
      expect(getReadableError('Not authenticated')).toBe('Please sign in to continue.');
    });
  });

  // ── Common server errors ────────────────────────────────────────────────────

  describe('Common server error patterns', () => {
    it('should map "Internal Server Error"', () => {
      expect(getReadableError('Internal Server Error')).toBe(
        'Something went wrong on our end. Please try again later.'
      );
    });

    it('should map HTTP status "500" as substring', () => {
      expect(getReadableError('HTTP 500: database connection failed')).toBe(
        'Something went wrong on our end. Please try again later.'
      );
    });

    it('should map "503"', () => {
      expect(getReadableError('503 service unavailable')).toBe(
        'The service is temporarily unavailable. Please try again later.'
      );
    });

    it('should map "Service Unavailable"', () => {
      expect(getReadableError('Service Unavailable at this time')).toBe(
        'The service is temporarily unavailable. Please try again later.'
      );
    });
  });

  // ── Pattern matching is case-insensitive ────────────────────────────────────

  describe('case-insensitive matching', () => {
    it('should match patterns regardless of capitalisation', () => {
      expect(getReadableError('INVALID LOGIN CREDENTIALS supplied')).toBe(
        'Incorrect email or password. Please try again.'
      );
    });

    it('should match lowercase version of "Failed to fetch"', () => {
      expect(getReadableError('failed to fetch resource')).toBe(
        'Unable to connect to the server. Please check your internet connection.'
      );
    });
  });

  // ── Pass-through of human-readable messages ─────────────────────────────────

  describe('pass-through of short human-readable messages', () => {
    it('should pass through a short, clean message not in the map', () => {
      const msg = 'Patient not found';
      expect(getReadableError(msg)).toBe(msg);
    });

    it('should pass through a message under 100 characters with no technical markers', () => {
      const msg = 'Your appointment has already been booked';
      expect(getReadableError(msg)).toBe(msg);
    });
  });

  // ── Suppression of technical messages ──────────────────────────────────────

  describe('suppression of technical / unsafe messages', () => {
    it('should suppress messages containing a URL (http)', () => {
      expect(getReadableError('fetch error: http://api.example.com returned 404')).toBe(GENERIC);
    });

    it('should suppress messages containing ://', () => {
      expect(getReadableError('supabase://internal-error occurred')).toBe(GENERIC);
    });

    it('should suppress messages with all-caps SDK error codes (4+ chars)', () => {
      expect(getReadableError('PGRST301 schema validation failed')).toBe(GENERIC);
    });

    it('should suppress messages containing curly braces (JSON-like)', () => {
      expect(getReadableError('{"code":"PGRST100","message":"Bad request"}')).toBe(GENERIC);
    });

    it('should suppress messages containing square brackets', () => {
      expect(getReadableError('[ERROR] stack trace line 42')).toBe(GENERIC);
    });

    it('should suppress messages that include "Error:" prefix', () => {
      expect(getReadableError('Error: Cannot read property of undefined')).toBe(GENERIC);
    });

    it('should suppress messages longer than 100 characters', () => {
      const longMsg = 'a'.repeat(101);
      expect(getReadableError(longMsg)).toBe(GENERIC);
    });

    it('should pass through a message of exactly 99 characters with no technical markers', () => {
      // Build a clean 99-char string
      const cleanMsg = 'The appointment slot is no longer available '.padEnd(99, 'x');
      expect(getReadableError(cleanMsg)).toBe(cleanMsg);
    });
  });
});
