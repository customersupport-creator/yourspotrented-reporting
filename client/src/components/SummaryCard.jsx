/** Renders the AI management-style narrative summary. */
export default function SummaryCard({ summary }) {
  if (!summary) return null;
  return (
    <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">🧠</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700">AI Summary</h2>
      </div>
      <p className="leading-relaxed text-slate-700">{summary}</p>
    </div>
  );
}
