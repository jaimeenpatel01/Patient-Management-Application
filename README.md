# PhysioDesk

PhysioDesk is a mobile practice-management app for independent physiotherapists. It covers the day-to-day running of a clinic: patients, recurring appointments, attendance, consultation notes, documents, payments and GST invoices. It keeps working without a network connection.

Built with React Native (Expo SDK 54) and Supabase. Shipped on Android via Google Play (`com.drketuphysio.doctor`).

- **Website:** https://physiodesk.drketuphysio.in (served from [`docs/`](docs/), which also hosts the privacy policy and terms)
- **Current version:** see `expo.version` in [`app.json`](app.json)

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Database](#database)
- [Testing](#testing)
- [Building and releasing](#building-and-releasing)
- [Admin portal](#admin-portal)
- [Security](#security)
- [Known issues](#known-issues)
- [License](#license)

---

## Features

**Accounts**
- Email/password sign-up and sign-in, Google Sign-In, and password reset with an emailed one-time code.
- Google users complete their profile (phone, photo) on first sign-in.
- Profile: name, phone, photo, clinic billing details (clinic name, address, phone, GST number), password change.
- Self-service account deletion. A Supabase Edge Function removes the user's files and auth record.

**Patients**
- Patient directory with Active/Inactive filters, search, and an active toggle on each row.
- Patient record: age, gender, visit type (Home, Hospital, Doctor's Home), address, notes.
- Deleting a patient is a soft delete: it marks them inactive and keeps their history.
- Patient summary (details, attendance and payment history) exported as a PDF.

**Appointments and attendance**
- One-off or recurring appointments: daily, weekly, biweekly or monthly. A series ends after N sessions, on a date, or never.
- Appointment statuses: scheduled, completed, cancelled, no-show. You can cancel one occurrence or the whole series.
- Marking an appointment completed records an attendance. Recording an attendance automatically completes that day's scheduled appointment, via a database trigger.
- Attendance log grouped by date. Any visit can be shared as a calendar (`.ics`) event.

**Clinical records**
- Consultations with diagnoses and treatments, per patient.
- Document uploads (X-ray, MRI, prescription, report, progress photo, and more). Files go to private storage and open through short-lived signed URLs.

**Payments**
- Payment statuses: paid, pending, partially paid, cancelled, refunded. Methods: cash, UPI, other.
- Payments list filtered by status and date, with revenue totals.
- GST invoice PDF for any payment, ready to share.

**Insights and data**
- Dashboard: active and total patients, this month's earnings and outstanding dues, and quick actions.
- Business reports: 6-month revenue trend, patient retention, attendance patterns, top diagnoses.
- Export patients, payments or attendance as CSV or PDF.

**Platform**
- **Offline-first:** patients, appointments, attendance, payments and consultations can be read and edited offline. Changes are queued and synced when the device reconnects.
- **Languages:** English and Hindi. Coverage is partial: some screens are still English-only.
- **Update prompts:** a soft (dismissible) or hard (blocking) update prompt, controlled remotely from the admin portal.

## Tech stack

| Area | Technology |
|---|---|
| App | React Native 0.81, React 19.1, Expo SDK 54, TypeScript 5.9 (strict) |
| Navigation | Expo Router 6 (file-based, typed routes) |
| Backend | Supabase: PostgreSQL with Row-Level Security, Auth, Storage, Edge Functions (Deno) |
| Local storage | AsyncStorage for the session, offline cache and sync queue |
| Documents | `expo-print` (PDF), `expo-sharing`, `expo-file-system`, image and document pickers |
| i18n | i18next and react-i18next |
| Testing | Jest with ts-jest |
| Builds | EAS Build. GitHub Actions builds release APKs. |

No UI library. All components are custom, styled from the design tokens in `src/constants/theme.ts`.

## Getting started

### Prerequisites

- Node.js 22 or newer, and npm.
- Docker Desktop, for the local Supabase stack.
- For native builds: Android Studio with an emulator (or a device with USB debugging). Xcode is needed only for iOS builds.
- An Expo account and `eas-cli` (`npm i -g eas-cli`), only if you build with EAS.

### 1. Install

```bash
git clone https://github.com/jaimeenpatel01/Patient-Management-Application.git
cd Patient-Management-Application
npm install
```

### 2. Start a local backend

```bash
npx supabase start     # boots Postgres, Auth, Storage and Studio, then applies supabase/migrations
npx supabase status    # prints the API URL and anon key
```

| Service | URL |
|---|---|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Inbucket (catches auth emails) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

The storage buckets are not created by migrations. In Studio, create `avatars` as a **public** bucket and `medical_documents` as a **private** bucket.

### 3. Configure environment

Create `.env.development.local`. It is git-ignored and overrides `.env.local` in development.

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from `npx supabase status`>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<optional: Google OAuth web client ID>
```

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase API URL. The app throws at startup without it. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key. |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | For Google Sign-In | OAuth web client ID. |

`EXPO_PUBLIC_*` values are bundled into the app and are public. Never put a service-role key or any other secret in them.

On a physical device, use your computer's LAN IP instead of `127.0.0.1`. On the Android emulator, use `10.0.2.2`. Google Sign-In doesn't work against the local stack, so use email/password locally.

### 4. Run

```bash
npx expo start       # dev server; press a for Android or scan the QR code
npm run android      # build and run the native dev client on Android
```

Google Sign-In needs a native build (`npm run android` or an EAS development build). Everything else also runs in Expo Go.

## Scripts

| Command | Description |
|---|---|
| `npm start` | Expo dev server. `start:dev` / `start:prod` pick the env mode. |
| `npm run android` / `npm run ios` | Build and run a native dev client. |
| `npm run lint` | ESLint (`eslint-config-expo`). |
| `npm test` | Unit tests. Also `test:watch` and `test:coverage`. |
| `npm run db:start` / `db:stop` | Start or stop the local Supabase stack. |
| `npm run db:reset` | Wipe the local DB and re-apply all migrations. |
| `npm run db:new <name>` | Create a new migration file. |
| `npm run admin:dev` / `admin:prod` | Local admin portal against the dev or production DB. |

## Project structure

```
src/
├── app/                 # Screens (Expo Router)
│   ├── _layout.tsx      # Providers, auth redirects, update gate, splash
│   ├── (auth)/          # login, register, forgot/reset password, complete-profile
│   ├── (tabs)/          # Dashboard, Patients, Attendance, Appointments, Payments (+ hidden Profile)
│   ├── patient/         # add, edit, detail, consultations, payments, documents, summary
│   ├── appointment/     # create/edit series
│   ├── attendance/  payment/  consultation/
│   └── profile/         # personal info, password, language, billing, reports, export, help, about
├── components/          # UpdateRequiredModal, SplashScreen, ui/ (shared components)
├── constants/           # theme.ts (design tokens), options.ts (form options)
├── contexts/            # Auth, Network, Alert, Toast
├── hooks/               # useAuth, useNetwork
├── lib/                 # supabase client, i18n, offline cache + sync, formatters, validators, ...
├── services/            # Supabase data access (one file per entity)
│   └── offline/         # offline-aware wrappers used by screens
└── types/               # shared TypeScript types
supabase/
├── migrations/          # SQL schema, RLS, triggers, admin functions
└── functions/delete-account/
admin/                   # local-only admin portal (Node, no build)
docs/                    # public website, privacy policy, terms (GitHub Pages)
```

## Architecture

- **Data access.** All Supabase calls live in `src/services/`. Functions return `{ data, error }`, where `error` is a readable string. Screens import the offline-aware versions from `src/services/offline/`, which have the same signatures.
- **Offline sync.** When online, reads go to Supabase and are cached in AsyncStorage. When offline, reads come from the cache. Writes are applied locally with temporary IDs and queued in a persistent queue (`src/lib/syncQueue.ts`). When the device reconnects, `NetworkContext` replays the queue (`src/lib/syncEngine.ts`), maps temporary IDs to real ones, and refreshes the cache.
  - Documents, profile edits, reports, data export and account deletion need a connection.
- **Auth.** `AuthContext` holds the session and profile. The profile is cached so the app can start offline. The root layout sends signed-out users to login and Google users without a phone number to complete-profile.
- **Data isolation.** Each user is one doctor. Every table carries `doctor_id`, and RLS policies (`auth.uid() = doctor_id`) enforce isolation on the server.
- **Update gate.** On launch, the app compares its version with `min_app_version` in the public `app_settings` table and shows `UpdateRequiredModal` if it's older. If that check fails, no prompt is shown, so users are never locked out.

## Database

PostgreSQL on Supabase. The schema lives in [`supabase/migrations/`](supabase/migrations/).

| Table | Purpose |
|---|---|
| `profiles` | One row per doctor (created by a trigger on sign-up), including clinic billing details. |
| `patients` | Patient records (soft delete via `is_active`). |
| `appointment_series`, `appointments` | Recurring schedules and their individual occurrences. |
| `attendances` | Visits that took place. |
| `consultations`, `diagnoses`, `treatments` | Clinical notes. |
| `payments` | Payments, linked to a patient and optionally to an attendance. |
| `documents` | Metadata for files in the `medical_documents` bucket. |
| `app_settings` | Singleton row with update-prompt settings (public read). |

Storage buckets: `avatars` (public) and `medical_documents` (private, signed URLs).

**Changing the schema**
1. Run `npm run db:new <name>`, write the SQL, then `npm run db:reset` to test it locally.
2. Production has no recorded migration history. Apply new files by pasting them into the Supabase Studio SQL editor. Don't use `supabase db push`.

## Testing

```bash
npm test                # all suites
npm run test:coverage   # with a coverage report in coverage/
```

Tests live in `src/**/__tests__/*.test.ts`. They cover the core services (Supabase mocked in `src/services/__tests__/__mocks__`) and the pure helpers in `src/lib` (validators, formatters, error mapping, recurrence).

## Building and releasing

| EAS profile | Output | Use |
|---|---|---|
| `development` | Dev client | Local development on a device. |
| `preview` | APK | Internal testing. Also built by CI. |
| `production` | AAB | Google Play. |

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
eas build --platform android --profile production --local --non-interactive   # local .aab (~20 min)
```

**Release checklist**
1. Bump `expo.version` in `app.json`, and keep `APP_VERSION` in `src/constants/options.ts` in sync. EAS auto-increments the Android `versionCode` (`appVersionSource: remote`). The user-facing version is yours to bump.
2. Build the production `.aab` and upload it in Play Console with release notes.
3. Once the release is live, optionally raise the minimum version from the admin portal's App update tab:
   - **Soft:** a dismissible prompt.
   - **Hard:** blocks the app. Use it only for breaking changes, and only after the new version is installable.

**CI:** pushing a `v*` tag runs [`.github/workflows/release.yml`](.github/workflows/release.yml), which builds a preview APK on EAS and attaches it to a GitHub Release. It needs the `EXPO_TOKEN` repository secret.

## Admin portal

A local-only web console in [`admin/`](admin/) for viewing users and usage stats and for managing the update prompt. It uses the Supabase service-role key, binds to `127.0.0.1`, and must never be deployed. Setup is in [`admin/README.md`](admin/README.md).

## Security

- Row-Level Security is enabled on every table. Users can only see their own data.
- Medical documents are in a private bucket and are opened through signed URLs.
- The service-role key is used only by the Edge Function and the local admin portal. Keep it out of the app, `eas.json` and git.
- All `.env*` files are git-ignored. Keep signing keystores and build outputs out of version control too.
- To report a vulnerability, contact the maintainer privately rather than opening a public issue.

## Known issues

- Migrations `016_*` and `017_*` each have two files with the same version number. Renumber them before relying on `supabase db reset` or migration history.
- `delete_user()` (migration 009) is a leftover `SECURITY DEFINER` function with no `REVOKE`. The app uses the `delete-account` Edge Function instead, so drop or lock down this function.
- No migration defines storage policies for `medical_documents`, and no migration creates the buckets.
- Hindi translations cover only some screens.

## License

See [`LICENSE`](LICENSE).
