/**
 * SummaryProvider interface (contract).
 *
 * The AI Summary Engine is pluggable: any provider implements `generate` and is
 * selected in engine/index.js. v1 ships TemplateSummaryProvider (deterministic,
 * offline). A future LlmSummaryProvider (e.g. Claude API) can implement the same
 * method and be swapped in with no changes to the engine or sections.
 *
 *   generate(metrics, config) => string
 *
 * `metrics` is a flat object of already-computed numbers (see engine/index.js
 * `buildMetrics`), so providers never re-derive anything from raw rows.
 */
export class SummaryProvider {
  // eslint-disable-next-line no-unused-vars
  generate(metrics, config) {
    throw new Error('SummaryProvider.generate must be implemented by a subclass.');
  }
}

export default SummaryProvider;
