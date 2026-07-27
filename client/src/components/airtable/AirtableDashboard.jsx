import { useAirtableReport } from '../../hooks/useAirtableReport.js';
import AirtableKpiCards from './AirtableKpiCards.jsx';

function formatWeekLabel(start, end) {
  if (!start || !end) return '';
  const fmt = (d) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Live, Airtable-driven weekly dashboard — replaces manual CSV upload with
 * direct reads from Airtable, shows week-over-week deltas on every KPI, and
 * exposes a manual "Send Email" trigger for the Resend-powered weekly report.
 */
export default function AirtableDashboard() {
  const {
    status,
    error,
    weekStart,
    weekEnd,
    currentWeek,
    previousWeek,
    changeWeek,
    shiftWeek,
    reload,
    sendState,
    sendMessage,
    sendEmail,
  } = useAirtableReport();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => shiftWeek(-1)}
            disabled={status === 'loading'}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Previous week"
          >
            ←
          </button>

          <div className="flex items-center gap-2 text-sm">
            <label className="text-slate-400">
              Start
              <input
                type="date"
                value={weekStart}
                onChange={(ev) => changeWeek(ev.target.value, weekEnd)}
                className="ml-2 rounded-md border border-slate-200 px-2 py-1"
              />
            </label>
            <span className="text-slate-300">→</span>
            <label className="text-slate-400">
              End
              <input
                type="date"
                value={weekEnd}
                onChange={(ev) => changeWeek(weekStart, ev.target.value)}
                className="ml-2 rounded-md border border-slate-200 px-2 py-1"
              />
            </label>
          </div>

          <button
            onClick={() => shiftWeek(1)}
            disabled={status === 'loading'}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Next week"
          >
            →
          </button>

          <button
            onClick={reload}
            disabled={status === 'loading'}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
          >
            {status === 'loading' ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {sendMessage && (
            <span className={`text-xs ${sendState === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
              {sendMessage}
            </span>
          )}
          <button
            onClick={sendEmail}
            disabled={sendState === 'sending' || status !== 'ready'}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendState === 'sending' ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </div>

      {status === 'loading' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Loading live data from Airtable…
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn't load Airtable data: {error}
        </div>
      )}

      {status === 'ready' && currentWeek && (
        <>
          <p className="text-xs text-slate-400">
            Reporting period: <span className="font-medium text-slate-600">{formatWeekLabel(weekStart, weekEnd)}</span>
            {previousWeek && (
              <> · compared against {formatWeekLabel(previousWeek.weekStart, previousWeek.weekEnd)}</>
            )}
          </p>
          <AirtableKpiCards current={currentWeek} previous={previousWeek} />
        </>
      )}
    </div>
  );
}
