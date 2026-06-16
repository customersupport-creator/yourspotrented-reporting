import { round2 } from '../../utils/num.js';

/**
 * OPERATIONS & ENFORCEMENT (detail)
 *
 * Provides detail lists for the executive Operations section:
 *  - towLog: one row per towed vehicle (tow-log source).
 *  - parkpliantRecords: one row per encoded violation (Parkpliant source).
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

    const parkpliantRecords = rows
      .filter((r) => r._parkpliantSource && String(r.violationNotice || '').trim() !== '')
      .map((r) => ({
        notice: String(r.violationNotice || '').trim(),
        date: String(r.date || '').trim(),
        amount: round2(Number(r.violationAmount) || 0),
        status: String(r.violationStatus || '').trim(),
        facility: String(r.facility || '').trim(),
      }));

    return { towLog, parkpliantRecords };
  },
};
