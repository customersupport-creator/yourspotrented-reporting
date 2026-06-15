import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../utils/format.js';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#0891b2', '#db2777'];

function ChartCard({ title, children, empty }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-600">{title}</h3>
      {empty ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-400">No data</div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Four dashboard charts laid out in a responsive grid. */
export default function Charts({ report }) {
  if (!report) return null;
  const { charts, meta } = report;
  const currency = meta.currency || 'PHP';

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Violations Trend" empty={charts.violationsTrend.length === 0}>
        <LineChart data={charts.violationsTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis fontSize={11} allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="count" name="Encoded" stroke="#2563eb" strokeWidth={2} />
        </LineChart>
      </ChartCard>

      <ChartCard title="Payments Trend" empty={charts.paymentsTrend.length === 0}>
        <LineChart data={charts.paymentsTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis fontSize={11} allowDecimals={false} />
          <Tooltip formatter={(value, name) => (name === 'Net amount' ? formatCurrency(value, currency) : value)} />
          <Legend />
          <Line type="monotone" dataKey="count" name="Payments" stroke="#16a34a" strokeWidth={2} />
          <Line type="monotone" dataKey="amount" name="Net amount" stroke="#f59e0b" strokeWidth={2} />
        </LineChart>
      </ChartCard>

      <ChartCard title="Refund Status Breakdown" empty={charts.refundBreakdown.length === 0}>
        <PieChart>
          <Pie
            data={charts.refundBreakdown}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={(d) => `${d.status} (${d.count})`}
          >
            {charts.refundBreakdown.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ChartCard>

      <ChartCard title="Expense Breakdown" empty={charts.expenseBreakdown.length === 0}>
        <BarChart data={charts.expenseBreakdown} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="category" fontSize={11} />
          <YAxis fontSize={11} />
          <Tooltip formatter={(value) => formatCurrency(value, currency)} />
          <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
            {charts.expenseBreakdown.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartCard>
    </div>
  );
}
