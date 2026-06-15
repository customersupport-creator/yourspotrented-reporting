import { classify } from '../../services/mapper.js';

/**
 * HIGHLIGHTS / NEWS OF THE WEEK
 *  - illegal parkers towed
 *  - paid on Parkpliant
 *  - total violations encoded in Parkpliant
 *
 * Each metric is routed to its authoritative source sheet, and ONLY that sheet:
 *  - Towed  -> the tow log (a file with a TOWING COMPANY column): one per record
 *              that has a license plate.
 *  - Encoded / Paid on Parkpliant -> the Parkpliant Violations sheet (a file
 *              with a VIOLATION NOTICE NUMBER column): every notice is an encoded
 *              violation; a notice is "paid" when its Violation Status is Paid or
 *              it has a Settlement date. No other sheet contributes to these.
 *
 * When no specialized source is present (e.g. a single generic CSV), the metrics
 * fall back to status-keyword classification so simple uploads still work.
 */
export default {
  key: 'highlights',
  title: 'Highlights / News of the Week',
  compute(rows, config) {
    const { rules } = config;
    const hasParkpliant = rows.some((r) => r._parkpliantSource);
    const hasTowLog = rows.some((r) => r._towLogSource);

    let towed = 0;
    let paid = 0;
    let encoded = 0;

    for (const row of rows) {
      // --- Towed ---
      if (hasTowLog) {
        if (
          row._towLogSource &&
          (String(row.licensePlate || '').trim() !== '' || String(row.towingCompany || '').trim() !== '')
        ) {
          towed += 1;
        }
      } else if (classify(row.towingStatus, rules.towed)) {
        towed += 1;
      }

      // --- Encoded + Paid on Parkpliant (exclusively from the Parkpliant sheet) ---
      if (hasParkpliant) {
        if (row._parkpliantSource && String(row.violationNotice || '').trim() !== '') {
          encoded += 1;
          const isPaid =
            classify(row.violationStatus, rules.paid) || String(row.settlementDate || '').trim() !== '';
          if (isPaid) paid += 1;
        }
      } else {
        if (classify(row.violationStatus, rules.encoded)) encoded += 1;
        if (classify(row.paymentStatus, rules.paid)) paid += 1;
      }
    }

    return { towed, paid, encoded };
  },
};
