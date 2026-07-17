import { Router } from 'express';
import { getWeekData, getPreviousWeekData } from '../services/airtableService.js';
import { sendWeeklyReport } from '../services/emailService.js';

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
  const hasEmail = !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
  const hasRecipients = !!process.env.REPORT_RECIPIENTS;

  res.json({
    airtable: hasAirtable ? 'configured' : 'missing credentials',
    email: hasEmail ? 'configured' : 'missing credentials',
    recipients: hasRecipients ? process.env.REPORT_RECIPIENTS : 'not set',
    status: hasAirtable && hasEmail && hasRecipients ? 'ready' : 'incomplete',
  });
});

export default router;
