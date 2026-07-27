/**
 * Week-over-week ▲/▼ badge. `higherIsBetter` flips the color (e.g. lower
 * expenses is "good" and should read green, not red).
 */
export default function DeltaBadge({ current, previous, higherIsBetter = true, suffix = '%' }) {
  if (previous === undefined || previous === null || previous === 0) {
    return <span className="mt-1 block text-[11px] text-slate-300">No prior week data</span>;
  }
  if (current === undefined || current === null) return null;

  const diff = current - previous;
  const pct = (diff / Math.abs(previous)) * 100;
  const isFlat = Math.abs(pct) < 0.05;
  const isUp = diff > 0;
  const isGood = isFlat ? null : higherIsBetter ? isUp : !isUp;

  const colorClass = isFlat
    ? 'text-slate-400'
    : isGood
    ? 'text-emerald-600'
    : 'text-rose-600';

  const arrow = isFlat ? '▬' : isUp ? '▲' : '▼';

  return (
    <span className={`mt-1 block text-[11px] font-medium ${colorClass}`}>
      {arrow} {Math.abs(pct).toFixed(1)}
      {suffix} vs last week
    </span>
  );
}
