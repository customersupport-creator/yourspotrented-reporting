/**
 * OPERATIONS & ENFORCEMENT (detail)
 *
 * Provides the Tow Activity Log (one row per towed vehicle) for the executive
 * Operations section. Tow records come exclusively from a tow-log source (a file
 * with a TOWING COMPANY column); each row with a license plate is one tow.
 */
export default {
  key: 'enforcement',
  title: 'Operations & Enforcement',
  compute(rows) {
    const towLog = rows
      .filter((r) => r._towLogSource && String(r.licensePlate || '').trim() !== '')
      .map((r) => ({
        date: String(r.date || '').trim(),
        plate: String(r.licensePlate || '').trim(),
        facility: String(r.facility || '').trim(),
        company: String(r.towingCompany || '').trim(),
      }));

    return { towLog };
  },
};
