/**
 * Generates a GST-compliant invoice/receipt HTML string for a payment.
 * The HTML is rendered to a PDF via `expo-print` (see `src/app/patient/summary/[id].tsx`
 * for the reference pattern) and shared via `expo-sharing`.
 */

import type { Payment, Patient, Profile } from '@/types';
import { getDoctorDisplayName } from '@/lib/formatters';

/** Minimal patient shape needed for the invoice — works with both a full `Patient`
 *  and the lighter `PaymentWithPatient['patient']` projection used in list screens. */
export type InvoicePatient = Pick<Patient, 'full_name'> & Partial<Pick<Patient, 'phone' | 'address'>>;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPaymentType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(status: Payment['status']): string {
  switch (status) {
    case 'paid':
      return '#16A34A';
    case 'pending':
    case 'partially_paid':
      return '#F59E0B';
    case 'cancelled':
    case 'refunded':
      return '#DC2626';
    default:
      return '#475569';
  }
}

/** Derive a short invoice number from the payment id, e.g. "INV-A1B2C3D4". */
export function getInvoiceNumber(payment: Payment): string {
  return `INV-${payment.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function generateInvoiceHtml(payment: Payment, patient: InvoicePatient, profile: Profile): string {
  const invoiceNumber = getInvoiceNumber(payment);
  const doctorName = getDoctorDisplayName(profile.full_name, profile.email);
  const clinicName = profile.clinic_name || doctorName;
  const generatedOn = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #0F172A;
            padding: 32px;
            margin: 0;
          }
          .letterhead {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #0D9488;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .clinic-name {
            font-size: 22px;
            font-weight: 700;
            color: #0D9488;
            margin: 0 0 4px 0;
          }
          .doctor-name {
            font-size: 14px;
            color: #475569;
            margin: 0 0 8px 0;
          }
          .clinic-meta {
            font-size: 12px;
            color: #475569;
            line-height: 1.6;
            margin: 0;
          }
          .invoice-title {
            text-align: right;
          }
          .invoice-title h1 {
            font-size: 20px;
            color: #0F172A;
            margin: 0 0 6px 0;
            letter-spacing: 1px;
          }
          .invoice-title p {
            font-size: 12px;
            color: #475569;
            margin: 2px 0;
          }
          .section {
            margin-bottom: 24px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #94A3B8;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0 0 8px 0;
          }
          .bill-to {
            font-size: 14px;
            font-weight: 600;
            color: #0F172A;
            margin: 0 0 4px 0;
          }
          .bill-to-meta {
            font-size: 12px;
            color: #475569;
            margin: 2px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th {
            background-color: #F1F5F9;
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: left;
            padding: 10px 12px;
            border-bottom: 1px solid #E2E8F0;
          }
          td {
            padding: 12px;
            font-size: 13px;
            border-bottom: 1px solid #E2E8F0;
          }
          .amount-cell {
            text-align: right;
            font-weight: 600;
          }
          .totals {
            display: flex;
            justify-content: flex-end;
            margin-top: 16px;
          }
          .totals-box {
            width: 260px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 13px;
            color: #475569;
          }
          .totals-row.grand {
            border-top: 2px solid #0D9488;
            margin-top: 4px;
            padding-top: 12px;
            font-size: 16px;
            font-weight: 700;
            color: #0F172A;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #FFFFFF;
            background-color: ${statusColor(payment.status)};
          }
          .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #E2E8F0;
            font-size: 11px;
            color: #94A3B8;
            text-align: center;
          }
          .notes {
            font-size: 12px;
            color: #475569;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="letterhead">
          <div>
            <p class="clinic-name">${clinicName}</p>
            <p class="doctor-name">${doctorName}</p>
            <p class="clinic-meta">
              ${profile.clinic_address ? `${profile.clinic_address}<br/>` : ''}
              ${profile.clinic_phone ? `Phone: ${profile.clinic_phone}<br/>` : ''}
              ${profile.gst_number ? `GSTIN: ${profile.gst_number}` : ''}
            </p>
          </div>
          <div class="invoice-title">
            <h1>INVOICE / RECEIPT</h1>
            <p><strong>${invoiceNumber}</strong></p>
            <p>Date: ${formatDate(payment.payment_date)}</p>
          </div>
        </div>

        <div class="section">
          <p class="section-title">Billed To</p>
          <p class="bill-to">${patient.full_name}</p>
          ${patient.phone ? `<p class="bill-to-meta">Phone: ${patient.phone}</p>` : ''}
          ${patient.address ? `<p class="bill-to-meta">${patient.address}</p>` : ''}
        </div>

        <div class="section">
          <p class="section-title">Payment Details</p>
          <table>
            <tr>
              <th>Description</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th style="text-align: right;">Amount</th>
            </tr>
            <tr>
              <td>${formatPaymentType(payment.payment_type)}</td>
              <td style="text-transform: capitalize;">${payment.payment_method ? payment.payment_method.toUpperCase() : 'N/A'}</td>
              <td><span class="status-badge">${payment.status.replace('_', ' ')}</span></td>
              <td class="amount-cell">&#8377;${payment.amount.toLocaleString('en-IN')}</td>
            </tr>
          </table>
          ${payment.notes ? `<p class="notes"><strong>Notes:</strong> ${payment.notes}</p>` : ''}
        </div>

        <div class="totals">
          <div class="totals-box">
            <div class="totals-row grand">
              <span>Total</span>
              <span>&#8377;${payment.amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated receipt and does not require a signature.</p>
          <p>Generated on ${generatedOn}</p>
        </div>
      </body>
    </html>
  `;
}
