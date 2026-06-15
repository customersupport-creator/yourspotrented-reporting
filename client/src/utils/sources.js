/**
 * Derive clean, business-area labels for each data source from the metrics it
 * contributed — so the report never exposes filenames, record counts, or empty
 * sources. Shared by the on-screen breakdown and the PDF/Excel exports.
 */
export function areasFor(s) {
  const areas = [];
  if (s.highlights.towed > 0 || s.highlights.encoded > 0) areas.push('Violations & Towing');
  if (s.highlights.paid > 0 || s.netRemit.total > 0) areas.push('Payments & Remittance');
  if (s.refunds.processed.count + s.refunds.pending.count > 0) areas.push('Refunds');
  if (s.expenses.total > 0) areas.push('Expenses');
  return areas;
}

/**
 * Map perFileReports -> [{ label, sections }], omitting sources with no
 * reportable metric and de-duplicating colliding labels.
 */
export function labeledSources(perFileReports = []) {
  const seen = new Map();
  const out = [];
  for (const file of perFileReports) {
    const areas = areasFor(file.sections);
    if (areas.length === 0) continue;
    let label = areas.join(' · ');
    if (seen.has(label)) {
      const n = seen.get(label) + 1;
      seen.set(label, n);
      label = `${label} (${n})`;
    } else {
      seen.set(label, 1);
    }
    out.push({ label, sections: file.sections });
  }
  return out;
}
