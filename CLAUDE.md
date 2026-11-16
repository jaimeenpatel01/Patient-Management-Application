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

Migrations are in `supabase/migrations/`, numbered `NNN_description.sql` (zero-padded, sequential — keep this convention instead of the CLI's default timestamp names so ordering stays obvious).

**Environments:** the Supabase CLI is linked to the production project (`slszmmuonicyojnosvsa`). There is no separate hosted dev project — the local Docker stack started by `supabase start` (`db:start`) is the dev environment, and `.env.local` already points the app at it. Never run `supabase db push` against a migration you haven't first applied and tested locally.

**Workflow for schema changes:**
1. `npm run db:start` — boot the local stack (first run only needs Docker running).
2. `npm run db:new -- <description>` — scaffolds `supabase/migrations/<timestamp>_<description>.sql`; rename the file to the next `NNN_` number to match the existing convention.
3. Write the SQL, then `npm run db:reset` — wipes the local DB and replays every migration in order from scratch. This is what catches migrations that are broken or depend on manual steps a fresh apply won't have.
4. Run the app against `.env.local` and verify the change end-to-end.
5. Only once it's verified locally: `npm run db:push:prod` — applies pending migrations to the linked production project. The CLI lists what will run and asks for confirmation before applying.

Use `npm run db:migrations:list` any time to see which migrations are applied locally vs. on prod before pushing.

### TypeScript

Strict mode. Path alias `@/*` maps to `src/*`. All entity types are defined in `src/types/index.ts` — add new types there.

### Key Conventions

- Use `useFocusEffect` (not `useEffect`) for data fetching in screens — ensures refresh when navigating back.
- Map Supabase/auth errors through `src/lib/errorMessages.ts` before displaying to users.
- Form validation logic belongs in `src/lib/validators.ts`.
- Formatting (dates, currency, strings) belongs in `src/lib/formatters.ts`.
- Primary color: `#0D9488` (healthcare teal).
