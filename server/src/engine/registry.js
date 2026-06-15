/**
 * Section registry.
 *
 * The reporting engine is a list of independent section modules. Each module is:
 *
 *   { key: string, title: string, compute(rows, config) => sectionResult }
 *
 * To add a new report section later (e.g. a "Reason" section), write one module
 * and register it here — no other file needs to change. Sections never read each
 * other's output; they only see the normalized rows and the config, which keeps
 * them isolated and independently testable.
 */

export function createRegistry(initialSections = []) {
  const sections = [...initialSections];

  return {
    register(section) {
      if (!section || typeof section.compute !== 'function' || !section.key) {
        throw new Error('A section must have a `key` and a `compute(rows, config)` function.');
      }
      sections.push(section);
      return this;
    },

    list() {
      return [...sections];
    },

    /**
     * Run every registered section. Returns an object keyed by section.key:
     *   { highlights: {...}, customerService: {...}, ... }
     */
    runAll(rows, config) {
      const out = {};
      for (const section of sections) {
        out[section.key] = section.compute(rows, config);
      }
      return out;
    },
  };
}
