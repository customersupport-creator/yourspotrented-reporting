import cron from 'node-cron';
import { getWeekData, getPreviousWeekData } from '../services/airtableService.js';
import { sendWeeklyReport } from '../services/emailService.js';

function getLastWeekRange() {
  const now = new Date();
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  lastSunday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  const fmt = (d) => d.toISOString().split('T')[0];
  return { start: fmt(lastMonday), end: fmt(lastSunday) };
}

export async function runWeeklyEmailJob() {
  console.log('[weeklyEmailJob] Starting report generation...');

  try {
    const { start, end } = getLastWeekRange();
    console.log(`[weeklyEmailJob] Fetching data for ${start} to ${end}`);

    const [currentWeek, previousWeek] = await Promise.all([
      getWeekData(start, end),
      getPreviousWeekData(start),
    ]);

    const result = await sendWeeklyReport(currentWeek, previousWeek);
    console.log(`[weeklyEmailJob] ✅ Report sent to ${result.recipients.join(', ')}`);
    return { success: true, weekStart: start, weekEnd: end, recipients: result.recipients };
  } catch (err) {
    console.error('[weeklyEmailJob] ❌ Failed:', err.message);
    throw err;
  }
}

export function startWeeklyEmailJob() {
  cron.schedule(
    '59 5 * * 2',
    async () => {
      console.log('[weeklyEmailJob] Cron triggered — Monday 11:59 PM CST');
      try {
        await runWeeklyEmailJob();
      } catch (err) {
        console.error('[weeklyEmailJob] Cron job error:', err.message);
      }
    },
    { timezone: 'UTC' }
  );

  console.log('[weeklyEmailJob] Scheduled — runs every Monday at 11:59 PM CST');
}

export { getLastWeekRange };
