/**
 * Shows the CSVs attached this session, with per-file row counts (from the
 * preview) and a remove button. All listed files are combined into one report.
 */
export default function FileList({ files, preview, onRemove }) {
  if (!files.length) return null;

  const countFor = (name) => preview?.perFile?.find((p) => p.name === name)?.rowCount;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-600">
          Attached files ({files.length})
        </h4>
        {preview?.rowCount != null && (
          <span className="text-xs text-slate-400">{preview.rowCount} combined rows</span>
        )}
      </div>
      <ul className="divide-y divide-slate-100">
        {files.map((f) => {
          const rows = countFor(f.name);
          return (
            <li key={`${f.name}:${f.size}`} className="flex items-center justify-between py-2 text-sm">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="text-brand-600">📄</span>
                <span className="font-medium">{f.name}</span>
                {rows != null && <span className="text-xs text-slate-400">· {rows} rows</span>}
              </span>
              <button
                onClick={() => onRemove(f.name, f.size)}
                className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
