// PhysioDesk admin portal — local-only server.
// Run with `npm run admin`. Holds the Supabase service-role key; never deploy this.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const HOST = '127.0.0.1';
const PORT = Number(process.env.ADMIN_PORT) || 4500;
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy admin/.env.admin.example to admin/.env.admin and fill both in.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DIR = path.dirname(fileURLToPath(import.meta.url));
const STATIC = {
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
};

// Per-run token injected into the page; blocks other websites from calling the API (CSRF).
const TOKEN = randomBytes(32).toString('hex');
const ALLOWED_HOSTS = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function tokenOk(header) {
  if (typeof header !== 'string' || header.length !== TOKEN.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(TOKEN));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error('Request body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

// PostgREST/Postgres codes for "function or table doesn't exist", i.e. 015_admin_subscriptions.sql
// (or 012_subscriptions.sql) hasn't been applied to this database yet.
const MISSING_CODES = new Set(['PGRST202', 'PGRST205', '42883', '42P01']);

class DbError extends Error {
  constructor(error) {
    super(error.message);
    this.missing = MISSING_CODES.has(error.code);
  }
}

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new DbError(error);
  return data;
}

async function handleApi(req, res, url) {
  const { pathname } = url;
  const m = (re) => pathname.match(re);

  if (req.method === 'GET') {
    if (pathname === '/api/stats') return send(res, 200, await rpc('admin_app_stats'));
    if (pathname === '/api/users') return send(res, 200, await rpc('admin_users'));
    // Subscription endpoints: answer 501 { disabled: true } until 015 is applied.
    if (pathname === '/api/subscription-stats') return send(res, 200, await rpc('admin_subscription_stats'));
    if (pathname === '/api/user-subscriptions') return send(res, 200, await rpc('admin_user_subscriptions'));
    if (pathname === '/api/payments') return send(res, 200, await rpc('admin_subscription_payments'));
    if (pathname === '/api/plans') {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, tier, name, billing_interval, price_inr')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw new DbError(error);
      return send(res, 200, data);
    }
    // Settings tab: answers 501 { disabled: true } until 016_billing_settings.sql is applied.
    if (pathname === '/api/settings') {
      const [settings, plans] = await Promise.all([
        supabase
          .from('billing_settings')
          .select('upi_id, upi_payee_name, verification_sla_text, trial_days, updated_at')
          .maybeSingle(),
        supabase
          .from('subscription_plans')
          .select('id, tier, name, billing_interval, price_inr, patient_cap')
          .eq('is_active', true)
          .order('sort_order'),
      ]);
      if (settings.error) throw new DbError(settings.error);
      if (plans.error) throw new DbError(plans.error);
      return send(res, 200, { settings: settings.data, plans: plans.data });
    }
  }

  if (req.method === 'POST') {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) {
      return send(res, 415, { error: 'Expected application/json' });
    }
    const body = await readJson(req);
    let match;

    if ((match = m(/^\/api\/payments\/([^/]+)\/verify$/)) && UUID_RE.test(match[1])) {
      await rpc('admin_verify_subscription_payment', { p_payment_id: match[1] });
      return send(res, 200, { ok: true });
    }
    if ((match = m(/^\/api\/payments\/([^/]+)\/reject$/)) && UUID_RE.test(match[1])) {
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (!reason) return send(res, 400, { error: 'A rejection reason is required' });
      await rpc('admin_reject_subscription_payment', { p_payment_id: match[1], p_reason: reason });
      return send(res, 200, { ok: true });
    }
    if ((match = m(/^\/api\/users\/([^/]+)\/plan$/)) && UUID_RE.test(match[1])) {
      await rpc('admin_set_doctor_plan', {
        p_doctor_id: match[1],
        p_plan_id: body.plan_id,
        p_status: body.status,
        p_trial_ends_at: body.trial_ends_at || null,
        p_current_period_end: body.current_period_end || null,
      });
      return send(res, 200, { ok: true });
    }
    if (pathname === '/api/settings') {
      const error = validateSettings(body);
      if (error) return send(res, 400, { error });
      await rpc('admin_update_billing', {
        p_prices: body.prices,
        p_free_patient_cap: body.free_patient_cap,
        p_trial_days: body.trial_days,
        p_upi_id: body.upi_id.trim(),
        p_upi_payee_name: body.upi_payee_name.trim(),
        p_verification_sla_text: body.verification_sla_text.trim(),
      });
      return send(res, 200, { ok: true });
    }
  }

  return send(res, 404, { error: 'Not found' });
}

// Friendly errors before the database CHECK constraints in 016 get a say.
const UPI_RE = /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/;
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const isText = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;

function validateSettings(b) {
  if (!b.prices || typeof b.prices !== 'object' || Array.isArray(b.prices)) return 'Prices are missing';
  for (const [id, price] of Object.entries(b.prices)) {
    if (!(typeof price === 'number' && price > 0 && price <= 1_000_000)) return `Price for ${id} must be between ₹1 and ₹10,00,000`;
  }
  if (!isInt(b.free_patient_cap, 1, 100_000)) return 'Free patient limit must be a whole number of at least 1';
  if (!isInt(b.trial_days, 0, 365)) return 'Trial length must be 0–365 days';
  if (typeof b.upi_id !== 'string' || !UPI_RE.test(b.upi_id.trim())) return 'UPI ID must look like name@bank';
  if (!isText(b.upi_payee_name, 100)) return 'Payee name is required';
  if (!isText(b.verification_sla_text, 60)) return 'Verification time is required';
  return null;
}

const server = createServer(async (req, res) => {
  try {
    // Reject DNS-rebinding and cross-site requests.
    if (!ALLOWED_HOSTS.has(req.headers.host)) return send(res, 403, { error: 'Forbidden host' });
    const origin = req.headers.origin;
    if (origin && !ALLOWED_HOSTS.has(origin.replace(/^https?:\/\//, ''))) {
      return send(res, 403, { error: 'Forbidden origin' });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
      if (!tokenOk(req.headers['x-admin-token'])) return send(res, 403, { error: 'Missing or invalid admin token' });
      return await handleApi(req, res, url);
    }

    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await readFile(path.join(DIR, 'index.html'), 'utf8');
      return send(res, 200, html.replace('__ADMIN_TOKEN__', TOKEN), 'text/html; charset=utf-8');
    }
    const file = STATIC[url.pathname];
    if (file) return send(res, 200, await readFile(path.join(DIR, file[0]), 'utf8'), file[1]);

    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  } catch (err) {
    if (err.missing) return send(res, 501, { error: 'Subscriptions are not enabled on this database', disabled: true });
    send(res, err instanceof SyntaxError ? 400 : 500, { error: err.message || 'Server error' });
  }
});

server.listen(PORT, HOST, () => {
  const target = new URL(SUPABASE_URL).host;
  console.log(`PhysioDesk admin → http://${HOST}:${PORT}  (Supabase: ${target})`);
  console.log('Local only. Press Ctrl+C to stop.');
});
