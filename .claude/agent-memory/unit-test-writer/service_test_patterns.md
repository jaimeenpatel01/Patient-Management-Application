---
name: Service Test Patterns
description: Reusable patterns for testing PhysioDesk service functions (auth guard, fixtures, aggregation)
type: reference
---

## Fixture factory pattern

All service tests use typed factory functions with an `overrides` parameter:

```typescript
const makePatient = (overrides: Partial<Patient> = {}): Patient => ({
  id: 'patient-uuid-001',
  doctor_id: DOCTOR_ID,
  full_name: 'Priya Sharma',
  // ... all required fields
  ...overrides,
});
```

This keeps test data explicit and isolated without copy-paste.

## Auth guard test (mandatory for every service function)

Every service function checks `supabase.auth.getUser()` and returns early if unauthenticated.
Test pattern:

```typescript
it('should return empty array with auth error when user is not authenticated', async () => {
  mockGetUser(null);
  const result = await getPatients();
  expect(result).toEqual({ data: [], error: 'Not authenticated' });
});
```

Return shapes differ:
- List functions → `{ data: [], error: 'Not authenticated' }`
- Single-record functions → `{ data: null, error: 'Not authenticated' }`
- Delete functions → `{ error: 'Not authenticated' }`
- `getRevenueStatistics` → `{ data: { totalPaid: 0, totalPending: 0, thisMonthPaid: 0 }, error: 'Not authenticated' }`

## DB error test (mandatory for every service function)

```typescript
mockQueryResult({ data: null, error: { message: 'some DB error' } });
const result = await someServiceFn(...);
expect(result).toEqual({ data: ..., error: 'some DB error' });
```

Services extract `error.message` from the Supabase error object.

## getRevenueStatistics aggregation testing

This function aggregates rows client-side. Use these date helpers:

```typescript
function thisMonthDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
}
function lastMonthDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`;
}
```

Key behaviors:
- `paid` → `totalPaid` (always) + `thisMonthPaid` (if payment_date is in current month)
- `pending` + `partially_paid` → `totalPending`
- `cancelled` + `refunded` → ignored entirely
- `paid` with `null` payment_date → counts in `totalPaid` but NOT in `thisMonthPaid`
