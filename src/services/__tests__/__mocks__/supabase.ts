/**
 * Reusable Supabase mock factory for service tests.
 *
 * Usage in a test file:
 *   jest.mock('@/lib/supabase', () => require('./__mocks__/supabase'));
 *
 * Then control outcomes per-test via the exported mock query builder:
 *   mockQueryResult({ data: [...], error: null });
 *   mockGetUser({ id: 'doctor-uuid' });
 */

// ── Query builder chain ───────────────────────────────────────────────────────
// Every Supabase query method returns `this` until the terminal await resolves.
// We store the final { data, error } in `_queryResult` and override it per test.

let _queryResult: { data: unknown; error: unknown } = { data: null, error: null };
let _authUser: { id: string } | null = { id: 'doctor-uuid' };

/** Call this in beforeEach / it to set what the next query will return. */
export function mockQueryResult(result: { data: unknown; error: unknown }): void {
  _queryResult = result;
}

/** Call this to simulate an authenticated (or unauthenticated) user. */
export function mockGetUser(user: { id: string } | null): void {
  _authUser = user;
}

// Chain builder — every method returns itself so chaining works naturally.
// The object is then awaited; the Promise resolves to `_queryResult`.
function makeChain(): object {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'or', 'ilike', 'in', 'is',
    'order', 'range', 'single', 'limit',
  ] as const;

  for (const m of methods) {
    chain[m] = jest.fn(() => chain);
  }

  // Make the chain thenable so `await query` works
  type QueryResult = { data: unknown; error: unknown };
  type ResolveFn = (value: QueryResult) => QueryResult | PromiseLike<QueryResult>;
  (chain as { then: (r: ResolveFn) => Promise<QueryResult> }).then = (resolve: ResolveFn) =>
    Promise.resolve(_queryResult).then(resolve);

  return chain;
}

const _chain = makeChain();

export const supabase = {
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({ data: { user: _authUser }, error: null })
    ),
  },
  from: jest.fn(() => _chain),
};
