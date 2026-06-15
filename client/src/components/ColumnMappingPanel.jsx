import { useEffect, useState } from 'react';

/**
 * Admin panel (collapsible) to bind each logical field to a detected CSV header
 * before generating. Pre-filled from the server default config; edits are kept
 * in the shared config state and sent with the generate request.
 */
const FIELD_LABELS = {
  violationStatus: 'Violation status',
  paymentStatus: 'Payment status',
  towingStatus: 'Towing status',
  towingCompany: 'Towing company (marks a tow log)',
  licensePlate: 'License plate (counts a towed vehicle)',
  refundStatus: 'Refund status',
  expenseCategory: 'Expense category',
  amount: 'Amount',
  netRemitAmount: 'Net remit amount',
  refundAmount: 'Refund amount',
  expenseAmount: 'Expense amount',
  notes: 'Notes / comments',
  date: 'Date',
  csFlag: 'Customer service',
};

export default function ColumnMappingPanel({ config, setConfig, headers = [], missingFields = [] }) {
  const [open, setOpen] = useState(false);

  // Auto-open and reveal the panel when generation reported missing columns.
  useEffect(() => {
    if (missingFields.length > 0) setOpen(true);
  }, [missingFields.length]);

  if (!config) return null;
  const missingSet = new Set(missingFields);

  const setColumn = (field, header) =>
    setConfig({ ...config, columnMap: { ...config.columnMap, [field]: header } });

  const setRule = (rule, value) =>
    setConfig({
      ...config,
      rules: { ...config.rules, [rule]: value.split(',').map((s) => s.trim()).filter(Boolean) },
    });

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="font-medium text-slate-700">⚙️ Column mapping &amp; rules (admin)</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-6 border-t border-slate-100 px-5 py-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-600">Map logical fields to CSV columns</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.keys(FIELD_LABELS).map((field) => (
                <label key={field} className="text-sm">
                  <span className="mb-1 block text-slate-500">
                    {FIELD_LABELS[field]}
                    {missingSet.has(field) && <span className="ml-1 text-red-600">• required</span>}
                  </span>
                  <select
                    value={config.columnMap[field] || ''}
                    onChange={(e) => setColumn(field, e.target.value)}
                    className={`w-full rounded-md border px-2 py-1.5 text-sm ${
                      missingSet.has(field) ? 'border-red-400 bg-red-50' : 'border-slate-300'
                    }`}
                  >
                    <option value="">— not mapped —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                    {/* keep current value visible even if not in detected headers */}
                    {config.columnMap[field] && !headers.includes(config.columnMap[field]) && (
                      <option value={config.columnMap[field]}>{config.columnMap[field]}</option>
                    )}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-600">
              Classification keywords (comma-separated, case-insensitive)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(config.rules).map(([rule, keywords]) => (
                <label key={rule} className="text-sm">
                  <span className="mb-1 block text-slate-500">{rule}</span>
                  <input
                    type="text"
                    defaultValue={keywords.join(', ')}
                    onBlur={(e) => setRule(rule, e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
