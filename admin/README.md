# PhysioDesk Admin Portal

A local-only web page for viewing users, subscription payments and app stats. You can also verify or reject UPI payments and change a user's plan.

It runs on your machine at http://127.0.0.1:4500. It is **not** part of the mobile app and must never be deployed.

## Setup

1. Apply the admin migrations to the database you'll point at. They come in two parts:
   - `supabase/migrations/014_admin_portal.sql`: users list, user counts, usage totals. It depends only on 001–011, so it's **safe for production now**. Paste it into Studio's SQL editor.
   - `supabase/migrations/015_admin_subscriptions.sql`: plans, revenue, payments, verify/reject, plan changes. It requires `012_subscriptions.sql`, so **apply it only when subscriptions ship** (right after 012).
   - Until 015 is applied, the portal hides the Payments tab, the plan/revenue tiles and the plan columns, and shows a note instead. Nothing else to configure.
   - `supabase/migrations/016_billing_settings.sql`: the Settings tab (Pro prices, free patient limit, trial length, UPI ID / payee name / verification time). Requires 012; apply it with 012 and 015. The tab stays hidden until it's applied.
   - Local stack: `npx supabase db reset` wipes local data; `psql ... -f <file>` keeps it.
2. Run `cp admin/.env.admin.example admin/.env.admin` and fill in:
   - `SUPABASE_URL`: the project URL (local: `http://127.0.0.1:54321`).
   - `SUPABASE_SERVICE_ROLE_KEY`: Dashboard → Project Settings → API → `service_role` (local: `npx supabase status`).
3. Run `npm run admin` and open the printed URL.

## What it does

| Tab | Shows | Actions |
| --- | --- | --- |
| Overview | User counts and usage totals; plan breakdown and revenue (this month / all-time / est. MRR / pending) once 015 is applied | — |
| Users | Name, email, phone, clinic, joined, last sign-in, plan, status, trial/period end | Click a row to change their plan (+1 month, +1 year, +7-day trial, Free, or custom) |
| Payments (needs 015) | All subscription payments, filterable by status | Verify / reject pending payments |
| Settings (needs 016) | Pro prices, free plan patient limit, trial length, UPI details | Edit and save; a review step lists every change first |

Stats are calculated in Postgres, so only a small set of numbers is downloaded. Verify and reject call the existing `admin_verify_subscription_payment` / `admin_reject_subscription_payment` functions from migration 012.

## Security

- The service-role key bypasses Row-Level Security. Keep it only in `admin/.env.admin`, which is git-ignored. Never commit it or put it in the app.
- The server listens on `127.0.0.1` only and rejects requests with a foreign `Host`/`Origin`. Every API call needs a random per-run token embedded in the page, so other websites open in your browser can't trigger actions.
- The `admin_*` database functions can be executed only by `service_role`. Signed-in app users get "permission denied".
