// PhysioDesk admin portal — browser side. Served only by admin/server.mjs.
'use strict';

const TOKEN = document.querySelector('meta[name="admin-token"]').content;
const $ = (sel, root = document) => root.querySelector(sel);

const state = {
  stats: null,
  users: [],
  payments: [],
  plans: [],
  subsEnabled: true, // false until 012 + 015 are applied to the connected database
  billing: null, // { settings, plans } from /api/settings; null until 016 is applied
  pendingSettings: null, // settings save awaiting confirm
  userSearch: '',
  userFilter: '',
  sort: { key: 'created_at', dir: -1 },
  paymentStatus: 'pending',
  confirmVerify: null, // payment id awaiting confirm
  rejecting: null, // payment id with reason input open
  drawerUserId: null,
  pendingPlan: null, // plan change awaiting confirm
};

// ---------- helpers ----------
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');
const fmtMoney = (v) => inr.format(Number(v) || 0);
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

function relative(iso) {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

const STATE_LABEL = { pro_paid: 'Pro (paid)', trialing: 'Trialing', free: 'Free', expired: 'Expired' };
const pill = (cls, label) => `<span class="pill ${esc(cls)}">${esc(label)}</span>`;

// yyyy-mm-dd (local) <-> ISO end-of-day
const toDateInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromDateInput = (val) => {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
};
const addMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};
const later = (iso) => (iso && new Date(iso) > new Date() ? new Date(iso) : new Date());

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'X-Admin-Token': TOKEN, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { disabled: !!data.disabled });
  return data;
}

let bannerTimer;
function banner(msg, kind = 'error') {
  const el = $('#banner');
  el.textContent = msg;
  el.className = `banner ${kind}`;
  el.hidden = false;
  clearTimeout(bannerTimer);
  if (kind === 'success') bannerTimer = setTimeout(() => (el.hidden = true), 3500);
}

// ---------- data ----------
async function loadAll() {
  $('#refresh').disabled = true;
  try {
    const [stats, users, subs] = await Promise.all([api('/api/stats'), api('/api/users'), loadSubscriptions()]);
    state.subsEnabled = !!subs;
    if (subs) {
      const byId = new Map(subs.userSubs.map((s) => [s.doctor_id, s]));
      users.forEach((u) => Object.assign(u, byId.get(u.id)));
      Object.assign(stats, subs.stats);
      Object.assign(state, { payments: subs.payments, plans: subs.plans });
    } else {
      Object.assign(state, { payments: [], plans: [] });
    }
    state.billing = subs ? await loadBilling() : null;
    Object.assign(state, { stats, users });
    render();
    renderSettings(); // only re-rendered after a load, so switching tabs keeps unsaved edits
  } catch (err) {
    banner(err.message);
  } finally {
    $('#refresh').disabled = false;
  }
}

// Returns null when the database doesn't have the subscription migrations yet.
async function loadSubscriptions() {
  try {
    const [stats, userSubs, payments, plans] = await Promise.all([
      api('/api/subscription-stats'),
      api('/api/user-subscriptions'),
      api('/api/payments'),
      state.plans.length ? state.plans : api('/api/plans'),
    ]);
    return { stats, userSubs, payments, plans };
  } catch (err) {
    if (err.disabled) return null;
    throw err;
  }
}

// Returns null when the database doesn't have 016_billing_settings.sql yet.
async function loadBilling() {
  try {
    const billing = await api('/api/settings');
    return billing.settings ? billing : null;
  } catch (err) {
    if (err.disabled) return null;
    throw err;
  }
}

// ---------- overview ----------
function tile(label, value, { sub = '', cls = '' } = {}) {
  return `<div class="tile ${cls}"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${
    sub ? `<div class="sub">${esc(sub)}</div>` : ''
  }</div>`;
}

function renderOverview() {
  const s = state.stats;
  if (!s) return;
  const { users: u, plans: p, revenue: r, usage } = s;
  const subsHtml = state.subsEnabled
    ? `<div class="group"><h2>Plans</h2><div class="tiles">
      ${tile('Pro (paid)', num.format(p.pro_paid), { cls: 'accent' })}
      ${tile('Trialing', num.format(p.trialing), { sub: `${p.trials_ending_7d} ending within 7 days` })}
      ${tile('Free', num.format(p.free))}
      ${tile('Expired', num.format(p.expired))}
    </div></div>
    <div class="group"><h2>Revenue</h2><div class="tiles">
      ${tile('This month', fmtMoney(r.this_month), { cls: 'accent' })}
      ${tile('All time', fmtMoney(r.all_time))}
      ${tile('Est. MRR', fmtMoney(r.est_mrr), { sub: 'Active paid plans, yearly ÷ 12' })}
      ${tile('Pending payments', num.format(r.pending_count), {
        sub: fmtMoney(r.pending_amount),
        cls: r.pending_count ? 'warn' : '',
      })}
    </div></div>`
    : `<p class="note">Subscriptions aren't enabled on this database yet, so plans, revenue and payments are hidden.
       They appear automatically once <code>012_subscriptions.sql</code> and <code>015_admin_subscriptions.sql</code> are applied.</p>`;
  $('#view-overview').innerHTML = `
    <div class="group"><h2>Users</h2><div class="tiles">
      ${tile('Total users', num.format(u.total), { cls: 'accent' })}
      ${tile('New (7 days)', num.format(u.new_7d))}
      ${tile('New (30 days)', num.format(u.new_30d))}
    </div></div>
    ${subsHtml}
    <div class="group"><h2>App usage</h2><div class="tiles">
      ${tile('Active patients', num.format(usage.patients))}
      ${tile('Attendance records', num.format(usage.attendances))}
      ${usage.appointments == null ? '' : tile('Appointments', num.format(usage.appointments))}
      ${tile('Consultations', num.format(usage.consultations))}
    </div></div>`;
}

// ---------- users ----------
const USER_COLS = [
  ['full_name', 'User'],
  ['phone', 'Phone'],
  ['clinic_name', 'Clinic'],
  ['created_at', 'Joined'],
  ['last_sign_in_at', 'Last sign-in'],
  ['state', 'Plan', 'subs'],
  ['ends', 'Trial / period end', 'subs'],
];
const userCols = () => USER_COLS.filter((c) => state.subsEnabled || c[2] !== 'subs');
const endsAt = (u) => (u.status === 'trialing' ? u.trial_ends_at : u.current_period_end);

function renderUsers() {
  const q = state.userSearch.toLowerCase();
  const { key, dir } = state.sort;
  const rows = state.users
    .filter((u) => !state.subsEnabled || !state.userFilter || u.state === state.userFilter)
    .filter((u) =>
      !q || [u.full_name, u.email, u.phone, u.clinic_name].some((v) => (v || '').toLowerCase().includes(q))
    )
    .sort((a, b) => {
      const av = key === 'ends' ? endsAt(a) : a[key];
      const bv = key === 'ends' ? endsAt(b) : b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      return String(av).localeCompare(String(bv)) * dir;
    });

  $('#user-count').textContent = `${rows.length} of ${state.users.length}`;
  const cols = userCols();
  const head = cols.map(
    ([k, label]) => `<th data-sort="${k}">${esc(label)}${k === key ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`
  ).join('');
  const body = rows.length
    ? rows
        .map(
          (u) => `<tr class="clickable" data-user="${esc(u.id)}">
        <td><div>${esc(u.full_name || '—')}</div><div class="small">${esc(u.email)}</div></td>
        <td class="nowrap">${esc(u.phone || '—')}</td>
        <td>${esc(u.clinic_name || '—')}</td>
        <td class="nowrap">${fmtDate(u.created_at)}</td>
        <td class="nowrap">${esc(relative(u.last_sign_in_at))}</td>
        ${
          state.subsEnabled
            ? `<td>${pill(u.state, STATE_LABEL[u.state] || u.state)}<div class="small">${esc(u.plan_name || '')}</div></td>
        <td class="nowrap">${u.state === 'free' ? '—' : fmtDate(endsAt(u))}</td>`
            : ''
        }
      </tr>`
        )
        .join('')
    : `<tr><td colspan="${cols.length}" class="empty">No users match.</td></tr>`;
  $('#users-table').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}

// ---------- payments ----------
function renderPayments() {
  const pending = state.payments.filter((p) => p.status === 'pending').length;
  const badge = $('#pending-badge');
  badge.textContent = pending;
  badge.hidden = !pending;

  document.querySelectorAll('#payment-filter button').forEach((b) => {
    b.classList.toggle('active', b.dataset.status === state.paymentStatus);
    const count = b.dataset.status
      ? state.payments.filter((p) => p.status === b.dataset.status).length
      : state.payments.length;
    b.textContent = `${b.dataset.status ? b.dataset.status[0].toUpperCase() + b.dataset.status.slice(1) : 'All'} (${count})`;
  });

  const rows = state.payments.filter((p) => !state.paymentStatus || p.status === state.paymentStatus);
  const body = rows.length
    ? rows.map(paymentRow).join('')
    : `<tr><td colspan="7" class="empty">No ${esc(state.paymentStatus)} payments.</td></tr>`;
  $('#payments-table').innerHTML = `<thead><tr>
      <th>Submitted</th><th>User</th><th>Plan</th><th>Amount</th><th>Transaction ID</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>${body}</tbody>`;
  const reasonInput = $('#reject-reason');
  if (reasonInput) reasonInput.focus();
}

function paymentRow(p) {
  let actions = '';
  if (p.status === 'pending') {
    if (state.confirmVerify === p.id) {
      actions = `<span>Verify ${esc(fmtMoney(p.amount_inr))}?</span>
        <button class="btn sm" data-act="verify-yes" data-id="${esc(p.id)}">Yes, verify</button>
        <button class="btn sm ghost" data-act="cancel">Cancel</button>`;
    } else if (state.rejecting === p.id) {
      actions = `<input id="reject-reason" placeholder="Reason (shown to user)" maxlength="300">
        <button class="btn sm danger" data-act="reject-yes" data-id="${esc(p.id)}">Reject</button>
        <button class="btn sm ghost" data-act="cancel">Cancel</button>`;
    } else {
      actions = `<button class="btn sm" data-act="verify" data-id="${esc(p.id)}">Verify</button>
        <button class="btn sm danger ghost" data-act="reject" data-id="${esc(p.id)}">Reject</button>`;
    }
  } else if (p.status === 'rejected') {
    actions = `<span class="small">${esc(p.rejection_reason || '')}</span>`;
  } else {
    actions = `<span class="small">${fmtDateTime(p.verified_at)}</span>`;
  }
  return `<tr>
    <td class="nowrap">${fmtDateTime(p.created_at)}</td>
    <td><div>${esc(p.full_name || '—')}</div><div class="small">${esc(p.email || '')}</div></td>
    <td class="nowrap">${esc(p.plan_name || p.plan_id)}</td>
    <td class="num">${fmtMoney(p.amount_inr)}</td>
    <td><code>${esc(p.payment_reference)}</code>${p.payer_note ? `<div class="small">${esc(p.payer_note)}</div>` : ''}</td>
    <td>${pill(p.status, p.status)}</td>
    <td><div class="actions">${actions}</div></td>
  </tr>`;
}

// ---------- user drawer ----------
function openDrawer(id) {
  state.drawerUserId = id;
  state.pendingPlan = null;
  renderDrawer();
}
function closeDrawer() {
  state.drawerUserId = null;
  state.pendingPlan = null;
  $('#drawer').hidden = true;
}

function renderDrawer() {
  const u = state.users.find((x) => x.id === state.drawerUserId);
  if (!u) return closeDrawer();
  const payments = state.payments.filter((p) => p.doctor_id === u.id);
  const planOptions = state.plans
    .map((p) => `<option value="${esc(p.id)}" ${p.id === u.plan_id ? 'selected' : ''}>${esc(p.name)}</option>`)
    .join('');
  const statusOptions = ['active', 'trialing', 'expired', 'cancelled']
    .map((s) => `<option value="${s}" ${s === u.status ? 'selected' : ''}>${s}</option>`)
    .join('');

  const basics = `
    <h3 id="drawer-title">${esc(u.full_name || u.email)}</h3>
    ${state.subsEnabled ? pill(u.state, STATE_LABEL[u.state] || u.state) : ''}
    <dl class="kv">
      <dt>Email</dt><dd>${esc(u.email)}</dd>
      <dt>Phone</dt><dd>${esc(u.phone || '—')}</dd>
      <dt>Clinic</dt><dd>${esc(u.clinic_name || '—')}</dd>
      <dt>Joined</dt><dd>${fmtDateTime(u.created_at)}</dd>
      <dt>Last sign-in</dt><dd>${fmtDateTime(u.last_sign_in_at)}</dd>`;
  if (!state.subsEnabled) {
    $('#drawer-body').innerHTML = `${basics}</dl>`;
    $('#drawer').hidden = false;
    return;
  }
  $('#drawer-body').innerHTML = `${basics}
      <dt>Plan</dt><dd>${esc(u.plan_name || '—')} · ${esc(u.status || '—')}</dd>
      <dt>Trial ends</dt><dd>${fmtDate(u.trial_ends_at)}</dd>
      <dt>Period ends</dt><dd>${u.plan_id && u.plan_id !== 'free' && u.status === 'active' && !u.current_period_end ? 'No end date' : fmtDate(u.current_period_end)}</dd>
    </dl>

    <h4>Change plan</h4>
    <div class="quick">
      <button class="btn sm ghost" data-quick="month">+1 month Pro</button>
      <button class="btn sm ghost" data-quick="year">+1 year Pro</button>
      <button class="btn sm ghost" data-quick="trial">+7 days trial</button>
      <button class="btn sm ghost" data-quick="free">Set Free</button>
    </div>
    <form id="plan-form" class="form-grid">
      <label>Plan<select name="plan_id">${planOptions}</select></label>
      <label>Status<select name="status">${statusOptions}</select></label>
      <label>Trial ends<input type="date" name="trial_ends_at" value="${toDateInput(u.trial_ends_at)}"></label>
      <label>Period ends <span class="muted">(blank = no end)</span><input type="date" name="current_period_end" value="${toDateInput(u.current_period_end)}"></label>
      <div><button class="btn" type="submit">Save…</button></div>
    </form>
    <div id="plan-confirm"></div>

    <h4>Payments (${payments.length})</h4>
    ${
      payments.length
        ? `<ul class="mini">${payments
            .map(
              (p) => `<li><span>${fmtDate(p.created_at)} · ${esc(p.plan_name || p.plan_id)} · <code>${esc(
                p.payment_reference
              )}</code></span><span>${fmtMoney(p.amount_inr)} ${pill(p.status, p.status)}</span></li>`
            )
            .join('')}</ul>`
        : '<p class="muted">No payments yet.</p>'
    }`;
  $('#drawer').hidden = false;
  syncPlanForm();
}

function syncPlanForm() {
  const form = $('#plan-form');
  const plan = state.plans.find((p) => p.id === form.plan_id.value);
  const isFree = plan?.tier === 'free';
  form.status.disabled = isFree;
  form.trial_ends_at.disabled = isFree;
  form.current_period_end.disabled = isFree;
}

function applyQuick(kind) {
  const u = state.users.find((x) => x.id === state.drawerUserId);
  const form = $('#plan-form');
  const pro = (interval) => state.plans.find((p) => p.tier === 'pro' && p.billing_interval === interval);
  if (kind === 'month' || kind === 'year') {
    const plan = pro(kind === 'month' ? 'monthly' : 'yearly');
    const base = u.state === 'pro_paid' ? later(u.current_period_end) : new Date();
    form.plan_id.value = plan?.id || form.plan_id.value;
    form.status.value = 'active';
    form.trial_ends_at.value = '';
    form.current_period_end.value = toDateInput(addMonths(base, kind === 'month' ? 1 : 12).toISOString());
  } else if (kind === 'trial') {
    const base = u.state === 'trialing' ? later(u.trial_ends_at) : new Date();
    form.plan_id.value = u.plan_id && u.plan_id !== 'free' ? u.plan_id : pro('monthly')?.id;
    form.status.value = 'trialing';
    form.trial_ends_at.value = toDateInput(new Date(base.getTime() + 7 * 86_400_000).toISOString());
    form.current_period_end.value = '';
  } else if (kind === 'free') {
    form.plan_id.value = state.plans.find((p) => p.tier === 'free')?.id || 'free';
  }
  syncPlanForm();
  showPlanConfirm();
}

function showPlanConfirm() {
  const form = $('#plan-form');
  const plan = state.plans.find((p) => p.id === form.plan_id.value);
  const isFree = plan?.tier === 'free';
  const change = {
    plan_id: form.plan_id.value,
    status: isFree ? 'active' : form.status.value,
    trial_ends_at: isFree ? null : fromDateInput(form.trial_ends_at.value),
    current_period_end: isFree ? null : fromDateInput(form.current_period_end.value),
  };
  state.pendingPlan = change;
  let summary = `${plan?.name || change.plan_id}`;
  if (!isFree) {
    summary += ` · ${change.status}`;
    if (change.status === 'trialing') summary += ` until ${fmtDate(change.trial_ends_at)}`;
    else if (change.status === 'active') summary += change.current_period_end ? ` until ${fmtDate(change.current_period_end)}` : ' with no end date';
  }
  $('#plan-confirm').innerHTML = `<div class="confirm"><span>Set plan to <strong>${esc(summary)}</strong>?</span>
    <button class="btn sm" data-act="plan-yes">Confirm</button>
    <button class="btn sm ghost" data-act="plan-cancel">Cancel</button></div>`;
}

// ---------- settings ----------
const INTERVAL_UNIT = { monthly: 'per month', yearly: 'per year' };
const proPlans = () => state.billing.plans.filter((p) => p.tier === 'pro');
const freePlan = () => state.billing.plans.find((p) => p.tier === 'free');

function renderSettings() {
  state.pendingSettings = null;
  const view = $('#view-settings');
  if (!state.billing) {
    view.innerHTML = `<p class="note">Settings need <code>016_billing_settings.sql</code> applied to this database.</p>`;
    return;
  }
  const { settings: s } = state.billing;
  const field = (label, name, value, attrs = '') =>
    `<label><span>${label}</span><input name="${esc(name)}" value="${esc(value)}" ${attrs}></label>`;
  const priceFields = proPlans()
    .map((p) =>
      field(`${esc(p.name)} <span class="muted">(₹ ${INTERVAL_UNIT[p.billing_interval] || ''})</span>`,
        `price:${p.id}`, Number(p.price_inr), 'type="number" min="1" step="1" required')
    )
    .join('');

  view.innerHTML = `<form id="settings-form" class="settings" novalidate>
    <div class="group"><h2>Pro prices</h2><div class="panel">
      <div class="form-grid">${priceFields}</div>
      <p class="hint" id="saving-hint"></p>
      <p class="hint">Applies to new payments. Payments already submitted keep the amount they were made for.</p>
    </div></div>

    <div class="group"><h2>Free plan &amp; trial</h2><div class="panel"><div class="form-grid">
      ${field('Free plan patient limit', 'free_patient_cap', freePlan()?.patient_cap ?? '', 'type="number" min="1" step="1" required')}
      ${field('Pro trial for new signups <span class="muted">(days, 0 = none)</span>', 'trial_days', s.trial_days, 'type="number" min="0" max="365" step="1" required')}
    </div>
    <p class="hint">Trial length only affects people who sign up after you save.</p></div></div>

    <div class="group"><h2>UPI payment details</h2><div class="panel"><div class="form-grid">
      ${field('UPI ID', 'upi_id', s.upi_id, 'required maxlength="100" spellcheck="false"')}
      ${field('Payee name', 'upi_payee_name', s.upi_payee_name, 'required maxlength="100"')}
      ${field('Verification time <span class="muted">(“We’ll activate Pro …”)</span>', 'verification_sla_text', s.verification_sla_text, 'required maxlength="60"')}
    </div></div></div>

    <div class="actions">
      <button class="btn" type="submit">Review changes…</button>
      <span class="muted">Last saved ${fmtDateTime(s.updated_at)}. The app picks up changes the next time it loads or the Subscription screen opens.</span>
    </div>
    <div id="settings-confirm"></div>
  </form>`;
  updateSavingHint();
}

function readSettingsForm() {
  const form = $('#settings-form');
  const prices = {};
  for (const p of proPlans()) prices[p.id] = Number(form[`price:${p.id}`].value);
  return {
    prices,
    free_patient_cap: Number(form.free_patient_cap.value),
    trial_days: Number(form.trial_days.value),
    upi_id: form.upi_id.value.trim(),
    upi_payee_name: form.upi_payee_name.value.trim(),
    verification_sla_text: form.verification_sla_text.value.trim(),
  };
}

function updateSavingHint() {
  const hint = $('#saving-hint');
  if (!hint) return;
  const { prices } = readSettingsForm();
  const monthly = proPlans().find((p) => p.billing_interval === 'monthly');
  const yearly = proPlans().find((p) => p.billing_interval === 'yearly');
  const saving = monthly && yearly ? prices[monthly.id] * 12 - prices[yearly.id] : NaN;
  hint.textContent = Number.isFinite(saving)
    ? saving > 0
      ? `Yearly saves ${fmtMoney(saving)} vs 12 × monthly (shown in the app as “save ${fmtMoney(saving)}”).`
      : 'Yearly is not cheaper than 12 × monthly, so the app won’t show a saving.'
    : '';
}

function settingsChanges(next) {
  const { settings: s } = state.billing;
  const rows = [];
  const add = (label, from, to, fmt = (v) => v) => {
    if (String(from) !== String(to)) rows.push([label, fmt(from), fmt(to)]);
  };
  for (const p of proPlans()) add(`${p.name} price`, Number(p.price_inr), next.prices[p.id], fmtMoney);
  add('Free plan patient limit', freePlan()?.patient_cap ?? '—', next.free_patient_cap);
  add('Trial length (days)', s.trial_days, next.trial_days);
  add('UPI ID', s.upi_id, next.upi_id);
  add('Payee name', s.upi_payee_name, next.upi_payee_name);
  add('Verification time', s.verification_sla_text, next.verification_sla_text);
  return rows;
}

function settingsError(next) {
  if (Object.values(next.prices).some((v) => !(v > 0))) return 'Prices must be more than ₹0.';
  if (!Number.isInteger(next.free_patient_cap) || next.free_patient_cap < 1) return 'Free plan patient limit must be a whole number of at least 1.';
  if (!Number.isInteger(next.trial_days) || next.trial_days < 0 || next.trial_days > 365) return 'Trial length must be 0–365 days.';
  if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(next.upi_id)) return 'UPI ID must look like name@bank.';
  if (!next.upi_payee_name) return 'Payee name is required.';
  if (!next.verification_sla_text) return 'Verification time is required.';
  return null;
}

function showSettingsConfirm() {
  const next = readSettingsForm();
  const error = settingsError(next);
  if (error) return banner(error);
  const changes = settingsChanges(next);
  if (!changes.length) return banner('Nothing has changed.', 'success');
  state.pendingSettings = next;
  $('#settings-confirm').innerHTML = `<div class="confirm">
    <strong>Save ${changes.length} change${changes.length === 1 ? '' : 's'}?</strong>
    <ul class="changes">${changes
      .map(([label, from, to]) => `<li>${esc(label)}: <del>${esc(from)}</del> → <strong>${esc(to)}</strong></li>`)
      .join('')}</ul>
    <button class="btn sm" type="button" data-act="settings-yes">Save</button>
    <button class="btn sm ghost" type="button" data-act="settings-cancel">Cancel</button>
  </div>`;
}

// ---------- actions ----------
async function runAction(btn, fn, successMsg) {
  btn.disabled = true;
  try {
    await fn();
    banner(successMsg, 'success');
    state.confirmVerify = state.rejecting = null;
    await loadAll();
  } catch (err) {
    banner(err.message);
    btn.disabled = false;
  }
}

// ---------- routing & render ----------
const TABS = ['overview', 'users', 'payments', 'settings'];

function currentTab() {
  const t = location.hash.slice(1);
  if (t === 'payments' && !state.subsEnabled) return 'overview';
  if (t === 'settings' && !state.billing) return 'overview';
  return TABS.includes(t) ? t : 'overview';
}

function render() {
  const tab = currentTab();
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  for (const t of TABS) $(`#view-${t}`).hidden = t !== tab;
  $('a[data-tab="payments"]').hidden = !state.subsEnabled;
  $('a[data-tab="settings"]').hidden = !state.billing;
  $('#user-filter').hidden = !state.subsEnabled;
  renderOverview();
  renderUsers();
  if (state.subsEnabled) renderPayments();
  if (state.drawerUserId) renderDrawer();
}

// ---------- events ----------
window.addEventListener('hashchange', render);
$('#refresh').addEventListener('click', loadAll);
$('#user-search').addEventListener('input', (e) => {
  state.userSearch = e.target.value;
  renderUsers();
});
$('#user-filter').addEventListener('change', (e) => {
  state.userFilter = e.target.value;
  renderUsers();
});

$('#users-table').addEventListener('click', (e) => {
  const th = e.target.closest('th[data-sort]');
  if (th) {
    const key = th.dataset.sort;
    state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
    return renderUsers();
  }
  const tr = e.target.closest('tr[data-user]');
  if (tr) openDrawer(tr.dataset.user);
});

$('#payment-filter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.paymentStatus = b.dataset.status;
  state.confirmVerify = state.rejecting = null;
  renderPayments();
});

$('#payments-table').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;
  switch (btn.dataset.act) {
    case 'verify':
      state.confirmVerify = id;
      state.rejecting = null;
      return renderPayments();
    case 'reject':
      state.rejecting = id;
      state.confirmVerify = null;
      return renderPayments();
    case 'cancel':
      state.confirmVerify = state.rejecting = null;
      return renderPayments();
    case 'verify-yes':
      return runAction(btn, () => api(`/api/payments/${id}/verify`, {}), 'Payment verified — plan activated.');
    case 'reject-yes': {
      const reason = $('#reject-reason').value.trim();
      if (!reason) return banner('Enter a reason before rejecting.');
      return runAction(btn, () => api(`/api/payments/${id}/reject`, { reason }), 'Payment rejected.');
    }
  }
});
$('#payments-table').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'reject-reason') $('[data-act="reject-yes"]').click();
});

$('#drawer').addEventListener('click', (e) => {
  if (e.target.id === 'drawer' || e.target.closest('[data-close]')) return closeDrawer();
  const quick = e.target.closest('[data-quick]');
  if (quick) return applyQuick(quick.dataset.quick);
  const act = e.target.closest('[data-act]');
  if (act?.dataset.act === 'plan-cancel') {
    state.pendingPlan = null;
    $('#plan-confirm').innerHTML = '';
  } else if (act?.dataset.act === 'plan-yes' && state.pendingPlan) {
    const id = state.drawerUserId;
    const change = state.pendingPlan;
    runAction(act, () => api(`/api/users/${id}/plan`, change), 'Plan updated.');
  }
});
$('#drawer').addEventListener('change', (e) => {
  if (e.target.closest('#plan-form')) {
    syncPlanForm();
    state.pendingPlan = null;
    $('#plan-confirm').innerHTML = '';
  }
});
$('#drawer').addEventListener('submit', (e) => {
  e.preventDefault();
  showPlanConfirm();
});
$('#view-settings').addEventListener('submit', (e) => {
  e.preventDefault();
  showSettingsConfirm();
});
$('#view-settings').addEventListener('input', () => {
  updateSavingHint();
  if (state.pendingSettings) {
    state.pendingSettings = null;
    $('#settings-confirm').innerHTML = '';
  }
});
$('#view-settings').addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]');
  if (act?.dataset.act === 'settings-cancel') {
    state.pendingSettings = null;
    $('#settings-confirm').innerHTML = '';
  } else if (act?.dataset.act === 'settings-yes' && state.pendingSettings) {
    const next = state.pendingSettings;
    runAction(
      act,
      async () => {
        await api('/api/settings', next);
        state.plans = []; // reload plan names/prices used by the user drawer
      },
      'Settings saved.'
    );
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.drawerUserId) closeDrawer();
});

render();
loadAll();
