/**
 * networkState.ts
 *
 * Module-level singleton that holds connectivity state and the current user's ID.
 * This is intentionally NOT a React hook so that service wrappers (plain async
 * functions) can read the state without depending on the React tree.
 *
 * NetworkContext is the only writer; everything else is a reader.
 */

let _isOnline = true;
let _userId: string | null = null;

// ─── Online / Offline ──────────────────────────────────────────────────────────

export function getIsOnline(): boolean {
  return _isOnline;
}

export function setIsOnline(online: boolean): void {
  _isOnline = online;
}

// ─── User ID (for offline auth — avoids supabase.auth.getUser() network call) ──

export function getUserId(): string | null {
  return _userId;
}

export function setUserId(id: string | null): void {
  _userId = id;
}
