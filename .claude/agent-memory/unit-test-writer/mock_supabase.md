---
name: Supabase Mock Pattern
description: How the Supabase client is mocked for service unit tests — chain builder + per-test result control
type: reference
---

## File location

`src/services/__tests__/__mocks__/supabase.ts`

## How it works

The mock exports:
- `supabase` — the mocked client (used by services via `@/lib/supabase`)
- `mockQueryResult(result)` — set what the next DB query chain resolves to
- `mockGetUser(user | null)` — set the authenticated user (or null for unauthenticated)

The chain object supports all common Supabase builder methods (`select`, `insert`, `update`, `delete`, `eq`, `or`, `order`, `range`, `single`, etc.) and is made thenable so `await query` resolves to `_queryResult`.

## Registration in a test file

```typescript
import { mockQueryResult, mockGetUser, supabase } from './__mocks__/supabase';

jest.mock('@/lib/supabase', () => {
  const mock = require('./__mocks__/supabase');
  return { supabase: mock.supabase };
});
```

## Per-test reset pattern

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser({ id: DOCTOR_ID });     // authenticated by default
  mockQueryResult({ data: null, error: null }); // safe default
});
```

## TypeScript note for the chain's `then` method

The `.then` assignment must use explicit types to pass strict mode:

```typescript
type QueryResult = { data: unknown; error: unknown };
type ResolveFn = (value: QueryResult) => QueryResult | PromiseLike<QueryResult>;
(chain as { then: (r: ResolveFn) => Promise<QueryResult> }).then = (resolve: ResolveFn) =>
  Promise.resolve(_queryResult).then(resolve);
```

Using `Function` as the type fails TypeScript strict mode.

## Limitation

The mock is stateful — a single chain object is reused. If a test awaits two queries sequentially, both resolve to the same `_queryResult`. For tests needing different results per call, you must update `_queryResult` between awaits or restructure.
