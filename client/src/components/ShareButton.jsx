import { useState } from 'react';
import { publishReport } from '../api/client.js';

/**
 * Publishes the current report and produces a shareable public link
 * (<origin>/r/<id>) with a one-click Copy. The link renders the report read-only
 * for anyone who opens it.
 */
export default function ShareButton({ report, remit }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  if (!report) return null;

  const onShare = async () => {
    setError(null);
    setCopied(false);
    setBusy(true);
    try {
      const { id } = await publishReport(report, remit);
      const link = `${window.location.origin}/r/${id}`;
      setUrl(link);
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      } catch {
        /* clipboard may be blocked; the field below is selectable */
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onShare}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
      >
        {busy ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          '🔗'
        )}
        {busy ? 'Creating…' : 'Share Link'}
      </button>

      {url && (
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="w-56 bg-transparent px-1 text-xs text-slate-600 outline-none"
          />
          <button onClick={copy} className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
