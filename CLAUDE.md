# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. User-facing setup docs are in `README.md`.

## Commands

```bash
npx expo start          # Dev server (press a for Android, or scan the QR code)
npm run android         # Build + run native dev client on Android (needed for Google Sign-In)
npm run ios             # Build + run native dev client on iOS
npm run lint            # ESLint (eslint-config-expo flat config; ignores dist/ and admin/)
npm test                # Jest unit tests
npm run test:coverage   # Tests with coverage report
npx tsc --noEmit        # Typecheck. Errors under supabase/functions/ are expected (Deno code), ignore them.
eas build --platform android --profile preview      # Internal APK
eas build --platform android --profile production   # Play Store AAB
eas build --platform android --profile production --local --non-interactive  # .aab built on this machine (~20 min; writes build-<timestamp>.aab to the repo root, git-ignored)
```

Before finishing a change, run `npm test`, `npm run lint` and `npx tsc --noEmit`.

### Releasing a new version

1. Bump `expo.version` in `app.json` (e.g. `2.4.1` → `2.5.0`) and update `APP_VERSION` in `src/constants/options.ts` to match (it's hard-coded and shown on the About screen). Commit both. Every release needs a higher version than the last one shipped, or the update prompt can't tell builds apart. `eas.json` uses `appVersionSource: "remote"` + `autoIncrement`, so EAS bumps the Android `versionCode` itself; it does not bump `version`. `package.json`'s `version` is unused; ignore it.
2. Build the `.aab` (command above) and upload it in Play Console (internal testing or production) with release notes.
3. Once the release is live on Play Store, optionally prompt users on older builds from the admin portal's App update tab (`npm run admin:prod`):
   - **Soft:** set the minimum version to the new version. Users get a dismissible prompt that returns on every launch.
   - **Hard:** only for breaking changes. It blocks the app until they update, so never use it before the version is installable.
   - Routine releases need no change there.

CI: pushing a `v*` tag runs `.github/workflows/release.yml`, which builds the `preview` APK on EAS and attaches it to a GitHub Release (needs the `EXPO_TOKEN` secret).

### Environment variables

Read only in `src/lib/supabase.ts`. The app throws at startup if the first two are missing.
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=   # Google Sign-In
```
- All `.env*` files are git-ignored. `.env.local` is dev and `.env.production` is for local production builds; `eas.json`'s `preview` profile carries the same three values inline.
- `EXPO_PUBLIC_*` values are bundled into the app, so only public values go there. Never put a service-role key in them.

### Local Supabase (dev database)

The Supabase CLI is a devDependency; run it via `npx supabase` (or the `db:*` npm scripts). Requires Docker Desktop to be running.

```bash
npx supabase start            # Boot local stack (Postgres, Auth, Storage, Studio) and apply all migrations
npx supabase status           # Show local URLs and keys (API URL, anon key, Studio URL)
npx supabase db reset         # Wipe local DB and re-apply every migration in supabase/migrations/
npx supabase migration new <name>   # Create a new migration file
npx supabase functions serve  # Run edge functions (delete-account) locally
npx supabase stop             # Stop the stack (data persists; add --no-backup to wipe)
```

Defaults: API `http://127.0.0.1:54321`, Postgres `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, Studio `http://127.0.0.1:54323`, Inbucket (captures auth emails) `http://127.0.0.1:54324`.

To point the app at the local stack, create `.env.development.local` (git-ignored, overrides `.env.local` in dev) with the API URL and anon key from `npx supabase status`:
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
```
- On a physical device, use your machine's LAN IP instead of `127.0.0.1`. On the Android emulator, use `10.0.2.2`.
- Google Sign-In won't work locally (`supabase/config.toml` has no auth config); use email/password auth.
- No migration creates the storage buckets. Create them in Studio: `avatars` (public) and `medical_documents` (private).

### Admin portal (local only)

```bash
npm run admin:dev    # local DB  → http://127.0.0.1:4500 (env: admin/.env.admin)
npm run admin:prod   # production → http://127.0.0.1:4501 (env: admin/.env.admin.prod), red "Production" label
# Users, stats, app update prompt
```

Lives in `admin/` (plain Node + vanilla JS, no build, excluded from ESLint). Never deploy it or import it into the app. See `admin/README.md`.

Setup:
1. Create the env files. Both are git-ignored. `admin/.env.admin.example` is referenced in docs but doesn't exist yet, so write them by hand with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (optional `ADMIN_PORT`):
   - `admin/.env.admin` (dev): `SUPABASE_URL=http://127.0.0.1:54321` and the local `service_role` key from `npx supabase status`.
   - `admin/.env.admin.prod` (prod): the project URL and the `service_role` key from Dashboard → Project Settings → API.
   - The service-role key bypasses RLS; never commit it.
   - The server labels the session from `SUPABASE_URL`: localhost, `10.0.2.2` or a private LAN IP is Local (port 4500); anything else is Production (port 4501, red label).
2. Apply the admin migrations to the target database. They are service-role-only `admin_*` functions:
   - `016_admin_portal.sql`: users list, user counts, usage totals. Depends only on 001–011.
   - `017_admin_app_settings.sql`: `admin_update_app_settings`, used by the App update tab. Requires `014_app_settings.sql` and `015_app_settings_force_update.sql`.
   - On prod, paste the files into Studio's SQL editor; don't run `db push`, because prod has no recorded migration history.
   - Locally, `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f <file>` applies a file without wiping data. `db reset` wipes it.
3. Run `npm run admin:dev` or `npm run admin:prod`.

Security model: the server binds to `127.0.0.1` only, checks `Host`/`Origin`, and requires a per-run token injected into the page. It also requires a JSON `Content-Type` on POSTs. App users get "permission denied" on all `admin_*` functions.

When changing admin code:
- The update prompt (`min_app_version`, `force_update`, `update_message` in `app_settings`) is managed from the portal's App update tab, not by hand-written SQL. The portal's `compareVersions` in `admin/app.js` mirrors `src/lib/version.ts`, and its default messages mirror `UpdateRequiredModal.tsx`; keep them in sync.
- Admin stats count `attendances`, and count `appointments` only when the table exists.
- Subscription admin features (plans, revenue, payments, billing settings) live on the unmerged `feature/subscription-model` branch; the portal hides those tabs until their functions exist. When that branch merges, its migrations (`012_subscriptions`, `014_admin_portal`, `015_admin_subscriptions`, `016_billing_settings`) collide with `main`'s numbers and must be renumbered after the last migration. Its `014_admin_portal.sql` is the same as `016_admin_portal.sql` here, so drop it.

## Architecture

**PhysioDesk** is a React Native / Expo (SDK 54, RN 0.81, React 19.1) app for independent physiotherapists: patients, recurring appointments, attendance, consultations, documents, payments and GST invoices. Each user is one doctor; all data is isolated by `doctor_id` via Supabase Row-Level Security. Android is the shipped platform (`com.drketuphysio.doctor`). `app.json` enables `typedRoutes` and `reactCompiler`.

### Navigation (Expo Router v6, file-based)

```
src/app/
├── _layout.tsx        # Providers (SafeArea → Alert → Toast → Auth → Network), auth redirects, update gate, JS splash
├── (auth)/            # login, register, forgot-password, reset-password (OTP), complete-profile
├── (tabs)/            # index (Dashboard), patients, attendance, appointments, payments; profile is hidden (href: null)
├── patient/           # add, edit/[id], [id]/{index, consultations, payments, documents, add-document}, summary/[id]
├── appointment/add    # create/edit a series
├── attendance/add  payment/add  consultation/{add, [id]}   # edit via ?id=
└── profile/           # personal-info, change-password, language, billing-info, reports, data-export, help-support, about
```

The root layout redirects users with no session to `/login`, and signed-in users away from auth screens (except reset/forgot-password). A Google user whose profile has no `phone` is redirected to `/complete-profile`.

### Data / service layer and offline sync

**Screens import from `@/services/offline/*.offline`, not from the plain services.** The offline modules have the same signatures as `src/services/*Service.ts`:
- **Online:** they call the real service and write the result through to the AsyncStorage cache (`src/lib/offlineCache.ts`).
- **Offline:** reads come from the cache. Writes create optimistic records with temp IDs (`Crypto.randomUUID()`) and enqueue a mutation in `src/lib/syncQueue.ts` (`@sync:queue`, dependencies between entries, `MAX_RETRIES = 3` before dropping).
- **Reconnect:** `NetworkContext` calls `syncEngine.processQueue()` (`src/lib/syncEngine.ts`), which replays oldest-first, maps temp IDs to real IDs and re-fetches collections. On first online launch it warms the cache (all patients, 100 attendances, 100 payments).
- **Current user:** offline code gets the user ID from `networkState.getUserId()` (`src/lib/networkState.ts`), never from `supabase.auth.getUser()`. Sign-out clears the cache.
- **Adding a new offline entity** means touching three places: the `.offline` module, the cache keys, and a case in `syncEngine`.

Offline-capable: patients, attendances, appointment series and appointments, payments, consultations/diagnoses/treatments, and dashboard stats.

Online-only, so these screens use plain services: documents, profile and avatar, `app_settings`, reports (`dashboardService`), data export, account deletion.

Plain services (`src/services/`) are the only code besides `syncEngine` that should call Supabase directly:
- `patientService.ts`: CRUD. `deletePatient` is a soft delete (`is_active = false`).
- `appointmentService.ts`: series + occurrences.
  - `createAppointmentSeries` generates occurrences with `src/lib/recurrence.ts`.
  - Ongoing series use a 90-day window that `topUpSeriesIfNeeded` extends, called when the Appointments tab gains focus.
  - Statuses are scheduled, completed, cancelled and no_show.
  - `cancelAppointmentSeries` deletes the series' scheduled and cancelled occurrences.
- `attendanceService.ts`: CRUD on `attendances` (visits that happened; no status). Paginated.
- `paymentService.ts`: paginated list with status and date filters, revenue stats.
- `medicalService.ts`: consultations, diagnoses, treatments.
- `documentService.ts`: uploads to the private `medical_documents` bucket and opens files via signed URLs.
- `profileService.ts`: profile update and avatar upload. Avatars go to the public `avatars` bucket, with a unique file name per upload to bust caches.
- `dashboardService.ts`: dashboard stats (daily/weekly/monthly computed; the UI shows only overview counts and monthly payments) plus the reports queries.
- `appSettingsService.ts`: reads the singleton `app_settings` row.

Functions return `{ data, error }` with `error` as a readable string (`null` on success). There are a few exceptions:
- Deletes return `{ error }` only.
- `uploadAvatar` returns `{ publicUrl, error }`.
- `getDocumentUrl` returns `{ url, error }`.

`src/services/offline/index.ts` doesn't re-export the appointments module (import it directly), and `wrappers.ts` is unused.

### Forced update prompt

`useUpdateGate()` in `src/app/_layout.tsx` runs once per launch, before and independent of auth.
- It compares the installed version with `min_app_version` in the singleton `app_settings` table (migrations 014/015, readable by anyone). The installed version is `Constants.expoConfig.version`, i.e. `app.json`'s `version` at build time.
- If the app is older, it shows `src/components/UpdateRequiredModal.tsx`. The prompt is hard when `force_update` is true (no dismiss, back button disabled) and soft otherwise ("Remind me later", hidden until the next launch).
- The modal opens the Play Store listing.
- If the settings can't be fetched, no prompt is shown; a backend problem never locks users out.

Version comparison is in `src/lib/version.ts`. Manage the values from the admin portal, not SQL.

### State management

React Contexts only (no Redux/Zustand), in `src/contexts/`:
- **AuthContext:** session, user, profile, and the auth actions:
  - signIn, signUp, signInWithGoogle, signOut, and the reset-password OTP flow.
  - The profile is cached for offline startup.
  - Access it via `useAuth()` from `src/hooks/useAuth.ts`.
- **NetworkContext:** NetInfo listener, triggers sync, exposes `isOnline` / `pendingSyncCount` / `isSyncing` via `useNetwork()`. No screen shows sync state yet.
- **AlertContext:** `useAlert().showAlert()` for confirmations; rendered by `CustomAlert`. Use it instead of `Alert.alert`.
- **ToastContext:** `useToast()` for transient success/error/warning messages.

### Auth details

- Google Sign-In uses `@react-native-google-signin/google-signin` and then `supabase.auth.signInWithIdToken`. It's configured lazily by `ensureGoogleSigninConfigured()` in `src/lib/supabase.ts` so Expo Go doesn't crash; it only works in native builds.
- Password reset: `resetPasswordForEmail`, then the user enters the emailed code (`verifyOtp`), then `updateUser`.
- Account deletion invokes the `delete-account` Edge Function (`supabase/functions/delete-account`, Deno, `verify_jwt = false`; it verifies the JWT itself). The function removes avatar and document files, then the auth user. Rows cascade.

### i18n

- i18next with `en` and `hi` (`src/lib/i18n.ts`, `src/lib/locales/*.json`). `src/lib/i18n.ts` is imported first in the root layout.
- The language is chosen on `profile/language.tsx` and persisted in AsyncStorage (`app_language`). There's no device-locale detection.
- Coverage is partial: only the tabs layout, Dashboard, Patients, Login, Language and ProfileMenu use `useTranslation`.
- When you add strings to a translated screen, add keys to **both** locale files.

### UI / design system

No external UI library. All design tokens (colors, typography, spacing, shadows, border radii, `STACK_HEADER_OPTIONS`) are in `src/constants/theme.ts`. Never hardcode colors or sizes. Primary color: `#0D9488` (healthcare teal). Form option lists (gender, visit type, statuses, document categories, etc.) are in `src/constants/options.ts`.

Shared components in `src/components/ui/`:
- **Actions and dialogs:** `ActionMenu`, `Button`, `CancelSeriesDialog`, `CustomAlert`, `SuccessModal` (uses `SuccessCheckmark`), `Toast`.
- **Inputs:** `ChipSelector`, `DateTimePicker`, `Input`, `PatientSearchPicker` (uses `SearchFilter`), `StatusToggle`.
- **Display:** `EmptyState`, `LoadingScreen`, `ProfileMenu` (exports `ProfileMenuButton`), `StatusBadge`.

Outside `ui/` are `src/components/UpdateRequiredModal.tsx` and `src/components/SplashScreen.tsx` (an animated JS splash).

### Database

PostgreSQL on Supabase. Migrations are in `supabase/migrations/`.

**Tables (11):**

| Table | Notes |
|---|---|
| `profiles` | Created by the `handle_new_user` trigger. Holds clinic billing/GST fields. The `role` column is unused. |
| `patients` | Has `age`, not DOB. `visit_type` is 'Home', 'Hospital' or "Doctor's Home". |
| `attendances` | Visits that took place. |
| `appointment_series`, `appointments` | `appointments` was dropped in 004 and recreated in 012. |
| `consultations`, `diagnoses`, `treatments` | |
| `payments` | Optional `attendance_id`. |
| `documents` | Metadata for files in `medical_documents`. |
| `app_settings` | Singleton, public read, no `doctor_id`. |

- Every table except `app_settings` has a UUID PK, `doctor_id`, an RLS policy `auth.uid() = doctor_id` (profiles use `id`), and `updated_at` triggers.
- Trigger 013 marks the nearest scheduled appointment completed when an attendance is inserted for the same doctor, patient and date.
- Removed tables: waitlist (016), exercise_plans (017).

Schema changes:
- Make them as new migration files and test with `npx supabase db reset`.
- Mirror type changes in `src/types/index.ts`.
- Prod has no recorded migration history, so apply SQL there through Studio, not `db push`.

Known schema issues (don't copy these patterns):
- `016_*` and `017_*` each have two files sharing a version number. Use the next unused number for new migrations.
- `delete_user()` from 009 is a `SECURITY DEFINER` RPC without `REVOKE`. The app doesn't use it.
- No migration defines storage policies for `medical_documents`.
- The DB allows gender values 'other' and 'prefer_not_to_say', but the TS `Gender` type is only 'male' | 'female'.

### TypeScript and tests

- Strict mode. Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`. All entity types live in `src/types/index.ts`; add new types there.
- Jest uses ts-jest with `tsconfig.test.json` and the node environment. Tests match `src/**/__tests__/**/*.test.ts`.
  - Service tests mock Supabase via `src/services/__tests__/__mocks__/supabase.ts`.
  - Put pure logic in `src/lib` so it can be unit-tested without React Native.

### Key conventions

- Use `useFocusEffect` (not `useEffect`) for data fetching in screens, so data refreshes when navigating back.
- Map Supabase/auth errors through `getReadableError()` in `src/lib/errorMessages.ts` before displaying them to users.
- Form validation belongs in `src/lib/validators.ts`, and formatting (dates, times, names) in `src/lib/formatters.ts`.
- Turn a local `Date` into a `YYYY-MM-DD` string with `toLocalDateString()` from `formatters.ts`, never `date.toISOString().split('T')[0]`.
  - The latter converts to UTC first, so in India (UTC+5:30) it gives the previous day before 5:30 am. It once broke the Payments date filter.
  - The only remaining uses (`src/lib/recurrence.ts`, `topUpSeriesIfNeeded` in `appointmentService.ts`) are correct because they work in UTC throughout.
- Paginated lists: `SectionList`/`FlatList` fire `onEndReached` right after mounting when the list is empty. Guard load-more so it can't run while the first page is still loading (see the `isFetchingRef` single-flight lock in `(tabs)/payments.tsx`). Otherwise an empty page 2 can overwrite page 1.
- PDFs are generated from HTML strings with `expo-print` and shared with `expo-sharing`. See `src/lib/invoiceTemplate.ts` (GST invoice) and `patient/summary/[id].tsx`. Escape user-entered text in templates (`htmlEscape` in `profile/data-export.tsx`). The invoice and summary templates don't escape yet.
