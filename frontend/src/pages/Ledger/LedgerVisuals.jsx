import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Label, ReferenceLine, Legend
} from 'recharts';
import { fmt, fmtAbs } from '../../utils/formatCents';

const CARD_STYLE = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 16,
  padding: '20px',
  boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 10px 24px rgba(15,23,42,0.08)',
};

const PALETTE = [
  '#38BDF8', '#00D28E', '#E879F9', '#FB923C', '#FBBF24',
  '#60A5FA', '#34D399', '#F472B6', '#A3E635', '#F87171',
  '#2DD4BF', '#818CF8', '#C084FC',
];

// Dark Tooltip Component
function DarkTooltip({ active, payload, label, isCents = true }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3.5 shadow-2xl text-xs pointer-events-none">
      {label && <p className="font-bold text-[#F8FAFC] mb-1.5">{label}</p>}
      {payload.map((p, idx) => (
        <div key={idx} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-1.5 text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            {p.name}:
          </span>
          <span className="font-bold text-[#F8FAFC]">
            {isCents ? fmt(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LedgerVisuals({ transactions = [], categories = [], lineItems = {}, month = '' }) {

  // 1. Calculate KPI Row values (Inflow, Outflow, Net, Savings Rate)
  const kpis = useMemo(() => {
    let inflow = 0;
    let outflow = 0;

    transactions.forEach(t => {
      if (t.status === 'excluded') return;
      if (t.amount_cents < 0) {
        inflow += Math.abs(t.amount_cents);
      } else {
        outflow += t.amount_cents;
      }
    });

    const net = inflow - outflow;
    const savingsRate = inflow > 0 ? Math.max(0, (net / inflow) * 100) : 0;

    return { inflow, outflow, net, savingsRate };
  }, [transactions]);

  // 2. Budget targets
  const totalBudgeted = useMemo(() => {
    const allItems = [...(lineItems.annual || []), ...(lineItems.guilt_free || [])];
    return allItems.reduce((s, item) => s + (item.monthly_amount_cents || 0), 0);
  }, [lineItems]);

  // 3. Category spending allocation
  const categoryData = useMemo(() => {
    const map = {};
    let totalSpent = 0;

    transactions.forEach(t => {
      if (t.status === 'excluded' || t.amount_cents <= 0) return;
      const catId = t.category_id || 'uncategorized';
      map[catId] = (map[catId] || 0) + t.amount_cents;
      totalSpent += t.amount_cents;
    });

    const categoryMap = {};
    categories.forEach(c => {
      categoryMap[c.id] = c.name;
    });

    return Object.entries(map)
      .map(([catId, value]) => {
        const name = catId === 'uncategorized' ? 'Needs Review' : (categoryMap[catId] || 'Other');
        return { name, value };
      })
      .sort((a, b) => b.value - a.value)
      .map((item, idx) => ({
        ...item,
        color: PALETTE[idx % PALETTE.length],
        pct: totalSpent > 0 ? ((item.value / totalSpent) * 100).toFixed(1) : '0',
      }));
  }, [transactions, categories]);

  // 4. Daily Cumulative Spend or Monthly Spend Trend
  const dailySpendData = useMemo(() => {
    if (!month) return []; // If all-time is selected, we do monthly grouping instead

    const [year, monthPart] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthPart, 0).getDate();

    // Init map of days
    const dailyMap = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = 0;
    }

    transactions.forEach(t => {
      if (t.status === 'excluded' || t.amount_cents <= 0) return;
      const day = new Date(t.date).getDate();
      if (dailyMap[day] !== undefined) {
        dailyMap[day] += t.amount_cents;
      }
    });

    let runningSum = 0;
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const amount = dailyMap[dayNum];
      runningSum += amount;

      const pace = totalBudgeted > 0 ? Math.round((totalBudgeted / daysInMonth) * dayNum) : null;

      return {
        dayLabel: `${monthPart}/${dayNum}`,
        'Daily Spend': amount,
        'Cumulative Spend': runningSum,
        'Budget Pace': pace,
      };
    });
  }, [transactions, month, totalBudgeted]);

  const monthlyTrendData = useMemo(() => {
    if (month) return []; // Only calculate if "All time" is selected

    const monthlyMap = {};
    transactions.forEach(t => {
      if (t.status === 'excluded') return;
      // Parse date to YYYY-MM
      const mStr = t.date.substring(0, 7);
      if (!monthlyMap[mStr]) {
        monthlyMap[mStr] = { inflow: 0, outflow: 0 };
      }
      if (t.amount_cents < 0) {
        monthlyMap[mStr].inflow += Math.abs(t.amount_cents);
      } else {
        monthlyMap[mStr].outflow += t.amount_cents;
      }
    });

    return Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mStr, val]) => {
        const [y, m] = mStr.split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, 1);
        const label = dateObj.toLocaleString('default', { month: 'short', year: '2-digit' });
        return {
          monthLabel: label,
          Inflow: val.inflow,
          Outflow: val.outflow,
          Net: val.inflow - val.outflow,
        };
      })
      .slice(-6); // Limit to last 6 active months for clean layout
  }, [transactions, month]);

  const selectedMonthLabel = useMemo(() => {
    if (!month) return 'All time';
    const [year, mPart] = month.split('-');
    const dateObj = new Date(Number(year), Number(mPart) - 1, 1);
    return dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [month]);

  const totalSpentOutflows = categoryData.reduce((s, c) => s + c.value, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-up">

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Inflows / Income', value: fmt(kpis.inflow), color: '#38BDF8', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.2)' },
          { label: 'Outflows / Spent', value: fmt(kpis.outflow), color: '#F87171', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.2)' },
          { label: 'Net Cash Flow', value: (kpis.net >= 0 ? '+' : '') + fmt(kpis.net), color: kpis.net >= 0 ? '#00D28E' : '#F87171', bg: kpis.net >= 0 ? 'rgba(0,210,142,0.06)' : 'rgba(248,113,113,0.06)', border: kpis.net >= 0 ? 'rgba(0,210,142,0.2)' : 'rgba(248,113,113,0.2)' },
          { label: 'Savings Rate', value: `${kpis.savingsRate.toFixed(1)}%`, color: '#FBBF24', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)' }
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Visual charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CHART 1: Burn Rate / Cumulative daily spend OR Monthly Trend */}
        {month ? (
          <div style={CARD_STYLE} className="flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] mb-1">Daily Cumulative Spend</h3>
              <p className="text-[10px] text-gray-500 mb-4">Track daily spending velocity against target linear budget pace</p>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySpendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F87171" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#F87171" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(51,65,85,0.25)" vertical={false} />
                  <XAxis dataKey="dayLabel" tick={{ fill: 'var(--text-3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${(v/100).toFixed(0)}`} tick={{ fill: 'var(--text-3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />

                  {totalBudgeted > 0 && (
                    <Area type="monotone" dataKey="Budget Pace" name="Linear Budget Pace" stroke="#EAB308" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} activeDot={false} />
                  )}
                  {totalBudgeted > 0 && (
                    <ReferenceLine y={totalBudgeted} stroke="#EF4444" strokeDasharray="3 3" label={{ value: `Limit: ${fmt(totalBudgeted)}`, fill: '#F87171', fontSize: 9, position: 'insideTopLeft' }} />
                  )}
                  <Area type="monotone" dataKey="Cumulative Spend" name="Cumulative Spend" stroke="#F87171" strokeWidth={2.5} fill="url(#spendGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div style={CARD_STYLE} className="flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] mb-1">Monthly Cash Flow Trend</h3>
              <p className="text-[10px] text-gray-500 mb-4">Comparison of inflows and outflows for the last 6 months</p>
            </div>
            <div style={{ height: 260 }}>
              {monthlyTrendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">No transaction data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(51,65,85,0.25)" vertical={false} />
                    <XAxis dataKey="monthLabel" tick={{ fill: 'var(--text-3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `$${(v/100).toFixed(0)}`} tick={{ fill: 'var(--text-3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Inflow" name="Inflow" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Outflow" name="Outflow" fill="#F87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* CHART 2: Category Spending Allocation */}
        <div style={CARD_STYLE} className="flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] mb-1">Category Spending Split · {selectedMonthLabel}</h3>
            <p className="text-[10px] text-gray-500 mb-4">Breakdown of outflows by budget category</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div style={{ height: 200 }}>
              {categoryData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">No spent categories</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      paddingAngle={categoryData.length > 1 ? 3 : 0}
                      dataKey="value"
                      animationDuration={500}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <Label position="center" content={({ viewBox: { cx, cy } }) => (
                        <g>
                          <text x={cx} y={cy - 6} textAnchor="middle" fill="#94A3B8" fontSize={9} fontWeight={600} letterSpacing="0.04em">TOTAL SPENT</text>
                          <text x={cx} y={cy + 10} textAnchor="middle" fill="#F87171" fontSize={13} fontWeight={800}>{fmt(totalSpentOutflows)}</text>
                        </g>
                      )} />
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {categoryData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800/40">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-300 truncate font-medium">{item.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-semibold text-[#F8FAFC]">{fmt(item.value)}</span>
                    <span className="text-[10px] text-gray-500 ml-1.5 font-medium">({item.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
