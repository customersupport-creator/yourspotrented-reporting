import { useCallback, useEffect, useState } from 'react';
import { getDefaultWeek, fetchAirtableWeek, sendWeeklyReportEmail } from '../api/airtable.js';

/**
 * Drives the live "Airtable" dashboard: loads the most recently completed
 * week by default, lets the user page to another week, and exposes a
 * send-email action for the manual "Send Email" button.
 *
 * status: 'idle' | 'loading' | 'ready' | 'error'
 */
export function useAirtableReport() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [currentWeek, setCurrentWeek] = useState(null);
  const [previousWeek, setPreviousWeek] = useState(null);
  const [sendState, setSendState] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'
  const [sendMessage, setSendMessage] = useState('');

  const load = useCallback(async (start, end) => {
    setStatus('loading');
    setError(null);
    try {
      const { currentWeek: cw, previousWeek: pw } = await fetchAirtableWeek(start, end);
      setCurrentWeek(cw);
      setPreviousWeek(pw);
      setWeekStart(start);
      setWeekEnd(end);
      setStatus('ready');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, []);

  // Bootstrap with the most recently completed Monday–Sunday week.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { start, end } = await getDefaultWeek();
        if (!cancelled) load(start, end);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const changeWeek = useCallback(
    (start, end) => {
      load(start, end);
    },
    [load]
  );

  const shiftWeek = useCallback(
    (deltaWeeks) => {
      if (!weekStart || !weekEnd) return;
      const start = new Date(weekStart);
      const end = new Date(weekEnd);
      start.setDate(start.getDate() + deltaWeeks * 7);
      end.setDate(end.getDate() + deltaWeeks * 7);
      const fmt = (d) => d.toISOString().split('T')[0];
      load(fmt(start), fmt(end));
    },
    [weekStart, weekEnd, load]
  );

  const sendEmail = useCallback(async () => {
    if (!weekStart || !weekEnd) return;
    setSendState('sending');
    setSendMessage('');
    try {
      const result = await sendWeeklyReportEmail(weekStart, weekEnd);
      setSendState('sent');
      setSendMessage(result.message || 'Report sent.');
    } catch (e) {
      setSendState('error');
      setSendMessage(e.message);
    }
  }, [weekStart, weekEnd]);

  return {
    status,
    error,
    weekStart,
    weekEnd,
    currentWeek,
    previousWeek,
    changeWeek,
    shiftWeek,
    reload: () => load(weekStart, weekEnd),
    sendState,
    sendMessage,
    sendEmail,
  };
}
