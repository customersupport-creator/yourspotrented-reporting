import { Resend } from 'resend';

// Lazily constructed so importing this module (e.g. via app.js in tests)
// never throws just because RESEND_API_KEY isn't set in that environment —
// the key is only required once an email actually needs to go out.
let resendClient = null;
function getResendClient() {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

function getWeekLabel(weekStart, weekEnd) {
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

function delta(current, previous, isPercent = false) {
  if (!previous || previous === 0) return '';
  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  const arrow = diff >= 0 ? '▲' : '▼';
  const color = diff >= 0 ? '#1D9E75' : '#D85A30';
  const label = isPercent ? `${Math.abs(diff).toFixed(1)}%` : `${Math.abs(pct)}%`;
  return `<span style="color:${color};font-size:12px;margin-left:6px">${arrow} ${label} vs last week</span>`;
}

function buildEmailHtml(reportData, prevData) {
  const { financials, enforcement, customerService, weekStart, weekEnd } = reportData;
  const weekLabel = getWeekLabel(weekStart, weekEnd);
  const prev = prevData || null;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#1a1f2e;padding:28px 32px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;">YOURSPOTRENTED</p>
            <h1 style="margin:6px 0 4px;color:#ffffff;font-size:22px;">Weekly Operations Report</h1>
            <p style="margin:0;color:#9ca3af;font-size:13px;">Reporting Period: ${weekLabel}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #f0f0f0;">
            <h2 style="margin:0 0 12px;color:#1a56db;font-size:15px;">Executive Summary</h2>
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">
              This week, <strong>${enforcement.illegalParkersTowed}</strong> illegal parkers were towed.
              A total of <strong>${enforcement.violationsEncoded}</strong> violations were encoded into Parkpliant,
              with <strong>${enforcement.violationsPaid}</strong> successfully paid
              (${enforcement.collectionRate.toFixed(1)}% collection rate).
              Customer service handled <strong>${customerService.totalCases}</strong> interactions
              with a <strong>${customerService.resolutionRate.toFixed(1)}%</strong> resolution rate.
              Net remittance reached <strong>$${financials.totalNetRemit.toLocaleString()}</strong>.
              <strong>${financials.refundsProcessedCount}</strong> refunds were processed
              ($${financials.refundsProcessedAmount.toFixed(2)}) while
              <strong>${financials.refundsPendingCount}</strong> remain pending.
              Total operating expenses amounted to <strong>$${financials.totalExpenses.toFixed(2)}</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #f0f0f0;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:15px;">Key Performance Indicators</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding:0 8px 16px 0;">
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;border-top:3px solid #1a56db;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;">Total Net Remittance</p>
                    <p style="margin:0;color:#1a56db;font-size:22px;font-weight:700;">$${financials.totalNetRemit.toLocaleString()}</p>
                    ${prev ? delta(financials.totalNetRemit, prev.financials.totalNetRemit) : ''}
                  </div>
                </td>
                <td width="50%" style="padding:0 0 16px 8px;">
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;border-top:3px solid #7c3aed;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;">Customer Service Cases</p>
                    <p style="margin:0;color:#7c3aed;font-size:22px;font-weight:700;">${customerService.totalCases}</p>
                    ${prev ? delta(customerService.totalCases, prev.customerService.totalCases) : ''}
                  </div>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:0 8px 16px 0;">
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;border-top:3px solid #059669;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;">Tow Conversion Rate</p>
                    <p style="margin:0;color:#059669;font-size:22px;font-weight:700;">${enforcement.towConversionRate.toFixed(1)}%</p>
                    ${prev ? delta(enforcement.towConversionRate, prev.enforcement.towConversionRate, true) : ''}
                  </div>
                </td>
                <td width="50%" style="padding:0 0 16px 8px;">
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;border-top:3px solid #d97706;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;">Parkpliant Collection Rate</p>
                    <p style="margin:0;color:#d97706;font-size:22px;font-weight:700;">${enforcement.collectionRate.toFixed(1)}%</p>
                    ${prev ? delta(enforcement.collectionRate, prev.enforcement.collectionRate, true) : ''}
                  </div>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:0 8px 0 0;">
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;border-top:3px solid #dc2626;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;">Total Expenses</p>
                    <p style="margin:0;color:#dc2626;font-size:22px;font-weight:700;">$${financials.totalExpenses.toFixed(2)}</p>
                    ${prev ? delta(financials.totalExpenses, prev.financials.totalExpenses) : ''}
                  </div>
                </td>
                <td width="50%" style="padding:0 0 0 8px;">
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;border-top:3px solid #6b7280;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;">Avg First Response</p>
                    <p style="margin:0;color:#111827;font-size:22px;font-weight:700;">${customerService.avgFRT.toFixed(2)} min</p>
                    ${prev ? delta(customerService.avgFRT, prev.customerService.avgFRT) : ''}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #f0f0f0;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:15px;">Refunds Processed (${financials.refundsProcessedCount})</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr style="background:#f9fafb;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb;">DATE</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb;">AMOUNT</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb;">CATEGORY</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb;">REASON</th>
              </tr>
              ${financials.refundRows.slice(0, 20).map((r, i) => `
              <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f0f0f0;">${r.date || ''}</td>
                <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f0f0f0;">$${(r.amount || 0).toFixed(2)}</td>
                <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f0f0f0;">${r.category || ''}</td>
                <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f0f0f0;">${r.reason || ''}</td>
              </tr>`).join('')}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
              YourSpotRented — Weekly Executive Report · Confidential · Prepared for Senior Management<br/>
              Report generated automatically · Data period: ${weekLabel}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWeeklyReport(reportData, prevData) {
  const recipients = process.env.REPORT_RECIPIENTS
    ? process.env.REPORT_RECIPIENTS.split(',').map((e) => e.trim())
    : [];

  if (recipients.length === 0) {
    throw new Error('No REPORT_RECIPIENTS configured in environment variables');
  }

  const weekLabel = getWeekLabel(reportData.weekStart, reportData.weekEnd);
  const html = buildEmailHtml(reportData, prevData);

  const { data, error } = await getResendClient().emails.send({
    from: 'YourSpotRented Weekly Reports <onboarding@resend.dev>',
    to: recipients,
    subject: `Weekly Operations Report — ${weekLabel}`,
    html,
  });

  if (error) throw new Error(error.message);

  return { messageId: data.id, recipients };
}
