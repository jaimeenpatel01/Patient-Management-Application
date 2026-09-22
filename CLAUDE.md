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

Migrations are in `supabase/migrations/`. Schema changes must be made there and applied via Supabase CLI.

### TypeScript

Strict mode. Path alias `@/*` maps to `src/*`. All entity types are defined in `src/types/index.ts` — add new types there.

### Key Conventions

- Use `useFocusEffect` (not `useEffect`) for data fetching in screens — ensures refresh when navigating back.
- Map Supabase/auth errors through `src/lib/errorMessages.ts` before displaying to users.
- Form validation logic belongs in `src/lib/validators.ts`.
- Formatting (dates, currency, strings) belongs in `src/lib/formatters.ts`.
- Primary color: `#0D9488` (healthcare teal).
