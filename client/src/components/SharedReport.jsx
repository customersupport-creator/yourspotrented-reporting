import { useEffect, useState } from 'react';
import { getSharedReport } from '../api/client.js';
import ExecutiveDashboard from './executive/ExecutiveDashboard.jsx';
import ExportButtons from './ExportButtons.jsx';

/**
 * Public read-only view of a published report, served at /r/:id. Fetches the
 * stored report and renders the executive dashboard exactly as published — no
 * upload UI, no editing. The recipient can still export it to PDF/Excel.
 */
export default function SharedReport({ id }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getSharedReport(id)
      .then((payload) => active && setState({ status: 'done', ...payload }))
      .catch((e) => active && setState({ status: 'error', message: e.message }));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <span className="text-sm font-medium text-slate-600">
            📄 Shared Weekly Report <span className="text-slate-400">· read-only</span>
          </span>
          {state.status === 'done' && <ExportButtons report={state.report} remit={state.remit} />}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {state.status === 'loading' && <p className="text-slate-400">Loading shared report…</p>}

        {state.status === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message || 'This shared report could not be loaded.'}
          </div>
        )}

        {state.status === 'done' && (
          <div id="report-capture" className="bg-slate-50">
            <ExecutiveDashboard report={state.report} remit={state.remit} shared />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        YourSpotRented Operations · Shared Report
      </footer>
    </div>
  );
}
