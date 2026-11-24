# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start          # Start dev server (scan QR for mobile, press w for web)
npm run android         # Run on Android emulator
npm run ios             # Run on iOS simulator
npm run lint            # ESLint
npm test                # Run unit tests (Jest)
npm run test:coverage   # Run tests with coverage report
eas build --platform android --profile preview   # Preview APK build
eas build --platform android --profile production # Production build
```

Environment variables (`.env` file required):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

### Local Supabase (dev database)

The Supabase CLI is a devDependency — run it via `npx supabase`. Requires Docker Desktop to be running.

```bash
npx supabase start            # Boot local stack (Postgres, Auth, Storage, Studio) and apply all migrations
npx supabase status           # Show local URLs and keys (API URL, anon key, Studio URL)
npx supabase db reset         # Wipe local DB and re-apply every migration in supabase/migrations/
npx supabase migration new <name>   # Create a new migration file
npx supabase functions serve  # Run edge functions (e.g. delete-account) locally
npx supabase stop             # Stop the stack (data persists; add --no-backup to wipe)
```

Defaults: API `http://127.0.0.1:54321`, Postgres `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, Studio `http://127.0.0.1:54323`, Inbucket (captures auth emails) `http://127.0.0.1:54324`.

To point the app at the local stack, create `.env.development.local` (git-ignored, overrides `.env.local` in dev) with the API URL and anon key from `npx supabase status`:
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
```
On a physical device use your machine's LAN IP instead of `127.0.0.1`; on the Android emulator use `10.0.2.2`. Google Sign-In won't work locally unless `[auth.external.google]` is configured in `supabase/config.toml` — use email/password auth for local testing.

### Admin portal (local only)

```bash
npm run admin   # http://127.0.0.1:4500 — users, subscription payments, stats; verify/reject payments, change plans
```

Lives in `admin/` (plain Node + vanilla JS, no build, excluded from ESLint). Never deploy it or import it into the app. See `admin/README.md`.

Setup:
1. Create the env file: `cp admin/.env.admin.example admin/.env.admin`. It's git-ignored. Fill in:
   - `SUPABASE_URL`: local stack `http://127.0.0.1:54321`.
   - `SUPABASE_SERVICE_ROLE_KEY`: Dashboard → Project Settings → API → `service_role`, or the local key from `npx supabase status`.
   - The service-role key bypasses RLS; never commit it.
2. Apply the admin migrations to the target database. They are service-role-only `admin_*` functions:
   - `014_admin_portal.sql`: users list, user counts, usage totals. Depends only on 001–011, so it's safe for prod now.
   - `015_admin_subscriptions.sql`: plans, revenue, payments, verify/reject, plan changes. Requires `012_subscriptions.sql`, so apply right after 012 when subscriptions ship. Until then the portal hides those features automatically.
   - `016_billing_settings.sql`: the Settings tab and `admin_update_billing`. Also requires 012; ship it with 012 and 015.
   - On prod, paste the files into Studio's SQL editor; don't run `db push`, because prod has no recorded migration history.
   - Locally, `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f <file>` applies a file without wiping data. `db reset` wipes it.
3. Run `npm run admin` and open http://127.0.0.1:4500.

Security model: the server binds to `127.0.0.1` only, checks `Host`/`Origin`, and requires a per-run token injected into the page. It also requires a JSON `Content-Type` on POSTs. App users get "permission denied" on all `admin_*` functions.

When changing admin SQL:
- `admin_subscription_state` (015) mirrors `getEffectiveTier` in `src/lib/subscription.ts`; keep them in sync.
- Billing values (Pro prices, free patient cap, trial days, UPI ID/payee, verification time) are edited in the portal's Settings tab, not in code. They live in `subscription_plans` and `billing_settings` (016). The app loads them into `AuthContext.billingSettings`; `src/constants/billing.ts` only holds offline fallbacks.
- `public.appointments` and `appointment_series` come from 012/013 (appointments feature, v2.4.0); the old table from 001 was dropped in 004. Admin stats count `attendances`, and count appointments only when the table exists.

## Architecture

**PhysioDesk** is a React Native / Expo app for physiotherapists to manage patients, appointments, consultations, documents, and payments. Single-doctor per instance; all data is isolated by `doctor_id` via Supabase Row-Level Security.

### Navigation (Expo Router v6, file-based)

```
src/app/
├── _layout.tsx          # Root layout — auth guard via useSegments + useRouter
├── (auth)/              # Public routes: login, register, forgot-password, reset-password, complete-profile
└── (tabs)/              # Protected routes: Dashboard, Patients, Attendance, Payments, Profile
    └── ...              # Nested stacks: patient/[id], consultation/[id], payment/add, etc.
```

The root `_layout.tsx` redirects unauthenticated users to `/login` and authenticated users away from auth screens. Google Sign-In users who haven't completed their profile are redirected to `/complete-profile`.

### State Management

Three React Contexts (no Redux/Zustand):
- **AuthContext** (`src/contexts/AuthContext.tsx`) — session, profile, sign-in/sign-out methods. Access via `useAuth()` hook.
- **ToastContext** — ephemeral notifications (success/error/warning). Auto-dismiss.
- **AlertContext** — modal confirmation dialogs for destructive actions.

### Data / Service Layer

All Supabase queries live in `src/services/`. Each function returns a `{ data, error }` tuple. Queries are pre-filtered by the authenticated user's `doctor_id` — Supabase RLS enforces this server-side as well.

Key services:
- `patientService.ts` — CRUD with soft-delete (`is_active` flag)
- `attendanceService.ts` — appointments with status tracking
- `medicalService.ts` — consultations, diagnoses, treatments, exercise plans
- `paymentService.ts` — transactions with multi-status (paid/pending/partially_paid)
- `documentService.ts` — file uploads to Supabase Storage
- `dashboardService.ts` — aggregated statistics

### UI / Design System

No external UI library — custom components only. All design tokens (colors, typography, spacing, shadows, border radii) are defined in `src/constants/theme.ts`. Never hardcode colors or sizes; always reference theme constants.

Reusable components in `src/components/ui/`: `Button`, `Input`, `CustomAlert`, `Toast`, `DateTimePicker`, `SearchFilter`, `StatusBadge`, `ChipSelector`, `PatientSearchPicker`, `EmptyState`, `LoadingScreen`, `SuccessModal`.

### Database

9 tables in Supabase (PostgreSQL): `profiles`, `patients`, `appointments`, `consultations`, `diagnoses`, `treatments`, `exercise_plans`, `documents`, `payments`. All have UUID PKs, `doctor_id` FK, `created_at`/`updated_at` managed by triggers.

Migrations are in `supabase/migrations/`. Schema changes must be made there and applied via Supabase CLI.

### TypeScript

Strict mode. Path alias `@/*` maps to `src/*`. All entity types are defined in `src/types/index.ts` — add new types there.

### Key Conventions

- Use `useFocusEffect` (not `useEffect`) for data fetching in screens — ensures refresh when navigating back.
- Map Supabase/auth errors through `src/lib/errorMessages.ts` before displaying to users.
- Form validation logic belongs in `src/lib/validators.ts`.
- Formatting (dates, currency, strings) belongs in `src/lib/formatters.ts`.
- Primary color: `#0D9488` (healthcare teal).
