# PhysioDesk Admin Portal

A local-only web page for viewing users and app stats, and for managing the in-app update prompt. When subscriptions are enabled it also handles UPI payments and plan changes.

It runs on your machine at http://127.0.0.1:4500. It is **not** part of the mobile app and must never be deployed.

## Setup

1. Apply the admin migrations to the database you'll point at. On production, paste each file into Studio's SQL editor (don't `db push`; prod has no recorded migration history). Each tab stays hidden until the migrations it needs are applied.
   - `supabase/migrations/016_admin_portal.sql`: users list, user counts, usage totals. It depends only on 001–011, so it's **safe for production now**.
   - `supabase/migrations/017_admin_app_settings.sql`: lets the App update tab save changes. Needs the update-gate migrations `014_app_settings.sql` and `015_app_settings_force_update.sql` first.
   - Subscriptions (plans, revenue, payments, billing settings) aren't on this branch yet. Their migrations live on the `feature/subscription-model` branch. Until they're applied, the portal hides the Payments and Settings tabs and the plan/revenue tiles, and shows a note instead.
   - Local stack: `npx supabase db reset` wipes local data; `psql ... -f <file>` keeps it.
2. Run `cp admin/.env.admin.example admin/.env.admin` and fill in:
   - `SUPABASE_URL`: the project URL (local: `http://127.0.0.1:54321`).
   - `SUPABASE_SERVICE_ROLE_KEY`: Dashboard → Project Settings → API → `service_role` (local: `npx supabase status`).
3. Run `npm run admin` and open the printed URL.

## What it does

| Tab | Shows | Actions |
| --- | --- | --- |
| Overview | User counts and usage totals; plan breakdown and revenue once subscriptions are enabled | — |
| Users | Name, email, phone, clinic, joined, last sign-in; plan, status and trial/period end once subscriptions are enabled | With subscriptions: click a row to change their plan |
| App update (needs 014, 015, 017) | What the update prompt does right now | Set the minimum version, soft or hard prompt, and an optional message; a review step lists every change first |
| Payments (needs subscriptions) | All subscription payments, filterable by status | Verify / reject pending payments |
| Settings (needs subscriptions) | Pro prices, free plan patient limit, trial length, UPI details | Edit and save; a review step lists every change first |

Stats are calculated in Postgres, so only a small set of numbers is downloaded.

## App update

Anyone whose installed app is older than the **minimum version** sees the update prompt the next time they open the app.

- **Soft:** a dismissible prompt with "Remind me later". It comes back on the next app launch.
- **Hard:** blocks the app until they update. Only use it once the new version is live on the Play Store, or users are locked out with nothing to install.
- **Turn prompt off** sets the minimum to `0.0.0`, so nobody is prompted.
- **Use app.json version** fills in the version from `app.json`, which is the version your next build ships as.
- The tab warns you if the minimum is higher than `app.json`'s version, because users can't update to a version you haven't released.

## Security

- The service-role key bypasses Row-Level Security. Keep it only in `admin/.env.admin`, which is git-ignored. Never commit it or put it in the app.
- The server listens on `127.0.0.1` only and rejects requests with a foreign `Host`/`Origin`. Every API call needs a random per-run token embedded in the page, so other websites open in your browser can't trigger actions.
- The `admin_*` database functions can be executed only by `service_role`. Signed-in app users get "permission denied".
