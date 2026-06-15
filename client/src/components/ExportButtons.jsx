import { useState } from 'react';
import { exportToPdf } from '../services/export/toPdf.js';
import { exportToExcel } from '../services/export/toExcel.js';

/**
 * Export the current report. PDF is a WYSIWYG capture of the on-screen report
 * (#report-capture); Excel is the structured data workbook.
 */
export default function ExportButtons({ report, remit }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // 'pdf' | 'excel' | null
  if (!report) return null;

  const fileBase = `weekly-report-${report.meta?.period?.end || ''}`.replace(/[^\w-]+/g, '-').replace(/-+$/, '');

  const onPdf = async () => {
    setError(null);
    setBusy('pdf');
    try {
      const el = document.getElementById('report-capture');
      await exportToPdf(el, { fileName: `${fileBase || 'weekly-report'}.pdf` });
    } catch (e) {
      setError(`Could not export PDF: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const onExcel = () => {
    setError(null);
    setBusy('excel');
    try {
      exportToExcel(report, remit, `${fileBase || 'weekly-report'}.xlsx`);
    } catch (e) {
      setError(`Could not export Excel: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPdf}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {busy === 'pdf' && <Spinner />}
        {busy === 'pdf' ? 'Rendering…' : '⬇ Export PDF'}
      </button>
      <button
        onClick={onExcel}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        ⬇ Export Excel
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
