import nodemailer from 'nodemailer';

function getRecipients() {
  const recipients = process.env.REPORT_RECIPIENTS || '';
  return recipients.split(',').map((value) => value.trim()).filter(Boolean);
}

export async function sendWeeklyReport(currentWeek, previousWeek) {
  const recipients = getRecipients();
  if (!recipients.length) {
    throw new Error('REPORT_RECIPIENTS is not configured');
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be configured');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  const html = `
    <h2>Weekly Report</h2>
    <p>Current week: ${currentWeek?.weekStart || 'n/a'} to ${currentWeek?.weekEnd || 'n/a'}</p>
    <p>Previous week: ${previousWeek?.weekStart || 'n/a'} to ${previousWeek?.weekEnd || 'n/a'}</p>
    <pre>${JSON.stringify({ currentWeek, previousWeek }, null, 2)}</pre>
  `;

  const info = await transporter.sendMail({
    from: user,
    to: recipients.join(','),
    subject: 'Weekly reporting summary',
    html,
  });

  return { recipients, messageId: info.messageId };
}
