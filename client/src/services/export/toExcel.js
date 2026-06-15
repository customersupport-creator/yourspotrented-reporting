import * as XLSX from 'xlsx';
import { formatCurrency } from '../../utils/format.js';

/**
 * Export Module — Excel.
 *
 * Builds a multi-sheet workbook from the report JSON (already in the browser, so
 * no server round-trip). Sheets: Summary, Highlights, Refunds, Expenses, Charts.
 */
export function exportToExcel(report, remit, filename = 'weekly-report.xlsx') {
  const { sections, meta, summary } = report;
  const currency = meta.currency || 'PHP';
  const netRemitTotal = remit?.hasInput ? remit.totalNetRemit : sections.netRemit.total;
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['YourSpotRented — Weekly Report'],
    ['Period', `${meta.period?.start || '—'} to ${meta.period?.end || '—'}`],
    ['Generated at', meta.generatedAt || ''],
    ['Rows processed', meta.rowCount],
    [],
    ['AI Summary'],
    [summary],
    [],
    ['Metric', 'Value'],
    ['Illegal parkers towed', sections.highlights.towed],
    ['Paid on Parkpliant', sections.highlights.paid],
    ['Encoded violations', sections.highlights.encoded],
    ['Customer service cases', sections.customerService.caseCount],
    ['Net remittance', netRemitTotal],
    ['Refunds processed (count)', sections.refunds.processed.count],
    ['Refunds processed (amount)', sections.refunds.processed.total],
    ['Refunds pending (count)', sections.refunds.pending.count],
    ['Refunds pending (amount)', sections.refunds.pending.total],
    ['Total expenses', sections.expenses.total],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Weekly Total Net Remit breakdown sheet (manual entry), when provided
  if (remit?.hasInput) {
    const remitRows = [
      ['Item', 'Net Amount', 'No. of Reservations'],
      ['Transient', remit.netTransient, remit.transientReservations],
      ['Monthly', remit.netMonthly, remit.monthlyReservations],
      ['Total', remit.totalNetRemit, remit.totalReservations],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(remitRows), 'Net Remit');
  }

  // Expenses detail sheet
  const expenseRows = [
    ['Category', 'Count', 'Amount', 'Percent'],
    ...sections.expenses.table.map((r) => [r.category, r.count, r.amount, `${r.percent}%`]),
    [],
    ['Total', '', sections.expenses.total, ''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expenseRows), 'Expenses');

  // Customer service detail
  const csRows = [
    ['Activity type', 'Count'],
    ...sections.customerService.activities.map((a) => [a.type, a.count]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(csRows), 'Customer Service');

  XLSX.writeFile(wb, filename);
}

// Re-export for callers that want a formatted currency string in custom sheets.
export { formatCurrency };
