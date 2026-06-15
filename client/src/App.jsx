import { useState } from 'react';
import { useReport } from './hooks/useReport.js';
import UploadDropzone from './components/UploadDropzone.jsx';
import FileList from './components/FileList.jsx';
import ColumnMappingPanel from './components/ColumnMappingPanel.jsx';
import SummaryCard from './components/SummaryCard.jsx';
import ReportView from './components/ReportView.jsx';
import ExportButtons from './components/ExportButtons.jsx';
import KpiCards from './components/dashboard/KpiCards.jsx';
import Charts from './components/dashboard/Charts.jsx';
import ExecutiveDashboard from './components/executive/ExecutiveDashboard.jsx';
import ShareButton from './components/ShareButton.jsx';
import SharedReport from './components/SharedReport.jsx';

export default function App() {
  // Public shared-report route: /r/<id> renders the saved report read-only.
  const sharedId = window.location.pathname.match(/^\/r\/([\w-]+)\/?$/)?.[1];
  if (sharedId) return <SharedReport id={sharedId} />;

  return <Workspace />;
}

function Workspace() {
  const { status, error, errorDetails, files, preview, config, setConfig, report, remit, setRemit, addFiles, removeFile, generate, reset } =
    useReport();
  const missingFields = errorDetails?.missingFields || [];
  const hasFiles = files.length > 0;
  // View switch only — same data, same flow. 'executive' is the new layout;
  // 'classic' preserves the original dashboard so nothing is lost.
  const [view, setView] = useState('executive');

  const canGenerate = status === 'ready' || status === 'done' || (status === 'error' && hasFiles);
  const generating = status === 'generating';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">YourSpotRented — Weekly Reporting Tool</h1>
            <p className="text-xs text-slate-400">Upload a CSV, generate the weekly operations report.</p>
          </div>
          <div className="flex items-center gap-4">
            {report && (
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium">
                <button
                  onClick={() => setView('executive')}
                  className={`rounded-md px-3 py-1.5 ${view === 'executive' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Executive
                </button>
                <button
                  onClick={() => setView('classic')}
                  className={`rounded-md px-3 py-1.5 ${view === 'classic' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Classic
                </button>
              </div>
            )}
            {report && <ShareButton report={report} remit={remit} />}
            {report && <ExportButtons report={report} remit={remit} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Upload + mapping + actions */}
        <div className="space-y-4">
          <UploadDropzone onFiles={addFiles} status={status} />

          <FileList files={files} preview={preview} onRemove={removeFile} />

          {preview && (
            <ColumnMappingPanel
              config={config}
              setConfig={setConfig}
              headers={preview.headers}
              missingFields={missingFields}
            />
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              {missingFields.length > 0 && (
                <span className="mt-1 block text-red-600">
                  Open the “⚙️ Column mapping (admin)” panel above (now expanded) and bind the highlighted
                  field{missingFields.length > 1 ? 's' : ''} to your CSV column{missingFields.length > 1 ? 's' : ''}.
                </span>
              )}
            </div>
          )}

          {hasFiles && (
            <div className="flex items-center gap-3">
              <button
                onClick={generate}
                disabled={!canGenerate || generating}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {generating ? 'Generating…' : 'Generate Report'}
              </button>
              <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700">
                Reset
              </button>
              {preview && (
                <span className="text-xs text-slate-400">
                  {preview.fileCount} file{preview.fileCount > 1 ? 's' : ''} · {preview.rowCount} combined rows
                </span>
              )}
            </div>
          )}
        </div>

        {/* Report — Executive (new) or Classic (original) layout.
            Wrapped in #report-capture so the PDF export is a WYSIWYG capture of
            exactly what is shown here. */}
        {report && (
          <div id="report-capture" className="bg-slate-50">
            {view === 'executive' && (
              <ExecutiveDashboard report={report} remit={remit} onRemitChange={setRemit} />
            )}

            {view === 'classic' && (
              <div className="space-y-6">
                <div data-pdf-block>
                  <SummaryCard summary={report.summary} />
                </div>

                <section>
                  <h2 data-pdf-block className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Dashboard</h2>
                  <div className="space-y-4">
                    <div data-pdf-block>
                      <KpiCards report={report} remit={remit} />
                    </div>
                    <div data-pdf-block>
                      <Charts report={report} />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 data-pdf-block className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Detailed Report</h2>
                  <div data-pdf-block>
                    <ReportView report={report} onRemitChange={setRemit} />
                  </div>
                </section>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        YourSpotRented Operations · Weekly Reporting Tool v1
      </footer>
    </div>
  );
}
