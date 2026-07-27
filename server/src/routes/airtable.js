import { Router } from 'express';
import { getWeekData, getPreviousWeekData } from '../services/airtableService.js';
import { sendWeeklyReport } from '../services/emailService.js';
import { getLastWeekRange } from '../jobs/weeklyEmailJob.js';

const router = Router();

router.get('/week', async (req, res, next) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      const err = new Error('start and end date are required');
      err.status = 400;
      err.code = 'MISSING_PARAMS';
      throw err;
    }

    const [currentWeek, previousWeek] = await Promise.all([
      getWeekData(start, end),
      getPreviousWeekData(start),
    ]);

    res.json({ currentWeek, previousWeek });
  } catch (err) {
    next(err);
  }
});

router.post('/send-email', async (req, res, next) => {
  try {
    const { start, end } = req.body;
    if (!start || !end) {
      const err = new Error('start and end date are required');
      err.status = 400;
      err.code = 'MISSING_PARAMS';
      throw err;
    }

    const [currentWeek, previousWeek] = await Promise.all([
      getWeekData(start, end),
      getPreviousWeekData(start),
    ]);

    const result = await sendWeeklyReport(currentWeek, previousWeek);
    res.json({
      success: true,
      message: `Report sent to ${result.recipients.join(', ')}`,
      messageId: result.messageId,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/health', (req, res) => {
  const hasAirtable = !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID;
  const hasEmail = !!process.env.RESEND_API_KEY;
  const hasRecipients = !!process.env.REPORT_RECIPIENTS;

  res.json({
    airtable: hasAirtable ? 'configured' : 'missing credentials',
    email: hasEmail ? 'configured' : 'missing RESEND_API_KEY',
    recipients: hasRecipients ? process.env.REPORT_RECIPIENTS : 'not set',
    status: hasAirtable && hasEmail && hasRecipients ? 'ready' : 'incomplete',
  });
});

// Convenience for the client: the most recently completed Monday–Sunday week,
// used to pre-fill the week picker on first load.
router.get('/default-week', (req, res) => {
  res.json(getLastWeekRange());
});

export default router;
