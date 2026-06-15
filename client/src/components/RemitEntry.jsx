import { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '../utils/format.js';

/**
 * Editable manual-entry block for the Weekly Total Net Remit section.
 *
 * Six fields:
 *   - Net Transient                 (amount)
 *   - No. of Transient Reservations (count)
 *   - Net Monthly                   (amount)
 *   - No. of Monthly Reservations   (count)
 *   - Total Net Remit               (amount, auto-summed; editable override)
 *   - No. of Total Reservations     (count,  auto-summed; editable override)
 *
 * The two totals auto-sum from their components and stay in sync as you type,
 * but can be manually overridden; "↻ auto" restores the computed sum. The
 * latest values are pushed up via onChange so the report and exports use them.
 */
const num = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function RemitEntry({ currency = 'PHP', csvComputedTotal, onChange }) {
  const [netTransient, setNetTransient] = useState('');
  const [transientRes, setTransientRes] = useState('');
  const [netMonthly, setNetMonthly] = useState('');
  const [monthlyRes, setMonthlyRes] = useState('');
  const [totalRemit, setTotalRemit] = useState('');
  const [totalRes, setTotalRes] = useState('');
  const [overrideRemit, setOverrideRemit] = useState(false);
  const [overrideRes, setOverrideRes] = useState(false);

  const autoRemit = num(netTransient) + num(netMonthly);
  const autoRes = num(transientRes) + num(monthlyRes);

  const effectiveRemit = overrideRemit ? num(totalRemit) : autoRemit;
  const effectiveRes = overrideRes ? num(totalRes) : autoRes;

  const hasInput = useMemo(
    () =>
      [netTransient, transientRes, netMonthly, monthlyRes].some((v) => String(v).trim() !== '') ||
      overrideRemit ||
      overrideRes,
    [netTransient, transientRes, netMonthly, monthlyRes, overrideRemit, overrideRes]
  );

  useEffect(() => {
    onChange?.({
      netTransient: num(netTransient),
      transientReservations: num(transientRes),
      netMonthly: num(netMonthly),
      monthlyReservations: num(monthlyRes),
      totalNetRemit: effectiveRemit,
      totalReservations: effectiveRes,
      hasInput,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netTransient, transientRes, netMonthly, monthlyRes, effectiveRemit, effectiveRes, hasInput]);

  const money = (v) => formatCurrency(v, currency);
  const displayRemit = overrideRemit ? totalRemit : autoRemit;
  const displayRes = overrideRes ? totalRes : autoRes;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Net Transient" prefix={currency} value={netTransient} onChange={setNetTransient} />
        <Field label="No. of Transient Reservations" value={transientRes} onChange={setTransientRes} />
        <Field label="Net Monthly" prefix={currency} value={netMonthly} onChange={setNetMonthly} />
        <Field label="No. of Monthly Reservations" value={monthlyRes} onChange={setMonthlyRes} />

        <Field
          label="Total Net Remit"
          prefix={currency}
          value={displayRemit}
          onChange={(v) => {
            setOverrideRemit(true);
            setTotalRemit(v);
          }}
          highlight
          auto={overrideRemit ? () => setOverrideRemit(false) : null}
        />
        <Field
          label="No. of Total Reservations"
          value={displayRes}
          onChange={(v) => {
            setOverrideRes(true);
            setTotalRes(v);
          }}
          highlight
          auto={overrideRes ? () => setOverrideRes(false) : null}
        />
      </div>

      <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">
          Finalized Total Net Remit
          {effectiveRes ? ` · ${effectiveRes} reservation${effectiveRes === 1 ? '' : 's'}` : ''}
        </span>
        <span className="text-lg font-bold text-brand-700">{money(effectiveRemit)}</span>
      </div>

      {csvComputedTotal != null && (
        <p className="text-xs text-slate-400">
          For reference, net remit computed from the uploaded CSV(s): {money(csvComputedTotal)}.
        </p>
      )}
    </div>
  );
}

function Field({ label, value, onChange, prefix, highlight, auto }) {
  return (
    <label className="text-sm">
      <span className="mb-1 flex items-center justify-between text-slate-500">
        <span>{label}</span>
        {auto && (
          <button type="button" onClick={auto} className="text-xs text-brand-600 hover:underline">
            ↻ auto
          </button>
        )}
      </span>
      <div
        className={`flex items-center rounded-md border ${
          highlight ? 'border-brand-300 bg-brand-50' : 'border-slate-300 bg-white'
        }`}
      >
        {prefix && <span className="px-2 text-xs text-slate-400">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full rounded-md bg-transparent px-2 py-1.5 text-sm outline-none"
        />
      </div>
    </label>
  );
}
