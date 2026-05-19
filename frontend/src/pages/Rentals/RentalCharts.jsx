import { useMemo } from 'react';
import { useRentalLedger, useRentalHistory } from '../../hooks/useRentals';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine,
  PieChart, Pie, Label,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

const CARD = {
  background: 'linear-gradient(145deg,#0F172A 0%,#1A2540 100%)',
  border: '1px solid #1E293B',
  borderRadius: 16,
  padding: '18px 20px',
  boxShadow: '0 6px 28px rgba(0,0,0,0.45)',
};

const EXPENSE_COLORS = ['#F87171','#FB923C','#FBBF24','#818CF8','#F472B6','#60A5FA','#34D399','#E879F9','#2DD4BF','#A3E635'];

function DarkTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: '8px 14px', fontSize: 12 }}>
      {label && <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#F8FAFC' }}>{label}</p>}
      {payload.filter(e => e.dataKey !== 'base').map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: e.color || '#94A3B8' }}>{e.name}:</span>
          <span style={{ fontWeight: 700, color: '#F8FAFC' }}>{formatCurrency(Math.abs(e.value))}</span>
        </div>
      ))}
    </div>
  );
}

// ── A: Cash Flow Waterfall ──────────────────────────────────────────────────
function CashFlowWaterfall({ property }) {
  const rent    = Number(property.rent) || 0;
  const pmFees  = Number(property.property_management_fees) || 0;
  const mortAmt = (Number(property.mortgage_pi) || 0) + (Number(property.mortgage_escrow) || 0);
  const net     = rent - pmFees - mortAmt;

  let running = 0;
  const steps = [
    { name: 'Gross Rent', delta: rent },
    ...(pmFees  > 0 ? [{ name: 'PM Fees',  delta: -pmFees  }] : []),
    ...(mortAmt > 0 ? [{ name: 'Mortgage', delta: -mortAmt }] : []),
  ];

  const data = steps.map(s => {
    const base = s.delta >= 0 ? running : running + s.delta;
    const row  = { name: s.name, base: Math.max(0, base), size: Math.abs(s.delta), pos: s.delta >= 0 };
    running += s.delta;
    return row;
  });
  data.push({ name: 'Net Cash Flow', base: 0, size: Math.abs(net), pos: net >= 0 });

  return (
    <div style={CARD}>
      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Monthly Cash Flow</p>
      <p style={{ margin: '0 0 14px', fontSize: 10, color: '#475569' }}>Where your rent money goes each month</p>
      <div style={{ height: 230 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <defs>
              <linearGradient id="wfPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D28E" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#00D28E" stopOpacity={0.45} />
              </linearGradient>
              <linearGradient id="wfNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F87171" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#F87171" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(51,65,85,0.35)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<DarkTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="base" stackId="w" fill="transparent" />
            <Bar dataKey="size" stackId="w" name="Amount" radius={[7,7,0,0]}>
              {data.map((d, i) => <Cell key={i} fill={d.pos ? 'url(#wfPos)' : 'url(#wfNeg)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #1E293B' }}>
        <span style={{ fontSize: 11, color: '#64748B' }}>Monthly Net: <b style={{ color: net >= 0 ? '#00D28E' : '#F87171' }}>{net >= 0 ? '+' : ''}{formatCurrency(net)}</b></span>
        <span style={{ fontSize: 11, color: '#64748B' }}>Annual: <b style={{ color: net >= 0 ? '#00D28E' : '#F87171' }}>{net >= 0 ? '+' : ''}{formatCurrency(net * 12)}</b></span>
      </div>
    </div>
  );
}

// ── C: Expense Category Donut ───────────────────────────────────────────────
function ExpenseDonut({ propertyId }) {
  const { ledger, loading } = useRentalLedger(propertyId);

  const { data, total } = useMemo(() => {
    const map = {};
    ledger.filter(e => e.type === 'Expense').forEach(e => {
      const cat = e.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + Number(e.amount);
    });
    const data = Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
    return { data, total: data.reduce((s, d) => s + d.value, 0) };
  }, [ledger]);

  return (
    <div style={CARD}>
      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Expense Breakdown</p>
      <p style={{ margin: '0 0 14px', fontSize: 10, color: '#475569' }}>All ledger expenses by category</p>
      <div style={{ height: 230 }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>Loading…</div>
        ) : data.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 12, textAlign: 'center' }}>No expense entries yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {data.map((_, i) => (
                  <radialGradient key={i} id={`eg${i}`} cx="40%" cy="40%" r="60%">
                    <stop offset="0%"   stopColor={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} stopOpacity={1} />
                    <stop offset="100%" stopColor={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} stopOpacity={0.6} />
                  </radialGradient>
                ))}
              </defs>
              <Pie data={data} cx="50%" cy="50%" innerRadius="50%" outerRadius="75%"
                paddingAngle={3} dataKey="value" animationDuration={600}>
                {data.map((_, i) => <Cell key={i} fill={`url(#eg${i})`} stroke="rgba(15,23,42,0.4)" strokeWidth={1} />)}
                <Label position="center" content={({ viewBox: { cx, cy } }) => (
                  <g>
                    <text x={cx} y={cy - 8} textAnchor="middle" fill="#64748B" fontSize={9} fontWeight={600} letterSpacing="0.06em">TOTAL</text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fill="#F87171" fontSize={14} fontWeight={800}>{formatCurrency(total)}</text>
                  </g>
                )} />
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <p style={{ margin: 0, color: '#F8FAFC', fontWeight: 600 }}>{d.name}</p>
                    <p style={{ margin: '4px 0 0', color: '#F87171', fontWeight: 700 }}>{formatCurrency(d.value)}</p>
                    <p style={{ margin: '2px 0 0', color: '#64748B', fontSize: 10 }}>{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</p>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      {data.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8, paddingTop: 10, borderTop: '1px solid #1E293B' }}>
          {data.slice(0, 6).map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#94A3B8' }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
              {d.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── D: Equity vs Debt Stack ─────────────────────────────────────────────────
function EquityDebtStack({ property }) {
  const marketValue = Number(property.current_market_value) || 0;
  const debt        = Number(property.mortgage_balance) || 0;
  const equity      = Math.max(0, marketValue - debt);
  const equityPct   = marketValue > 0 ? (equity / marketValue) * 100 : 100;
  const debtPct     = marketValue > 0 ? (debt   / marketValue) * 100 : 0;
  const appreciation = marketValue - (Number(property.purchase_price) || marketValue);

  return (
    <div style={CARD}>
      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Equity vs Debt</p>
      <p style={{ margin: '0 0 16px', fontSize: 10, color: '#475569' }}>Your ownership stake at current market value</p>

      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 30, fontWeight: 900, color: '#00D28E', letterSpacing: '-0.03em' }}>{formatCurrency(equity)}</p>
        <p style={{ margin: '3px 0 0', fontSize: 10, color: '#475569' }}>Your Equity ({equityPct.toFixed(1)}% owned)</p>
      </div>

      <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', gap: 2 }}>
        <div style={{ flex: equityPct, minWidth: debtPct < 100 ? 4 : 0, background: 'linear-gradient(90deg,#00B87D,#00D28E,#34D399)', boxShadow: '0 0 12px rgba(0,210,142,0.3)', transition: 'flex 1s ease' }} />
        {debt > 0 && <div style={{ flex: debtPct, minWidth: 4, background: 'linear-gradient(90deg,#EF4444,#F87171)', transition: 'flex 1s ease' }} />}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#00D28E' }} />
          <span style={{ fontSize: 10, color: '#64748B' }}>Equity</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#00D28E' }}>{formatCurrency(equity)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#F87171' }} />
          <span style={{ fontSize: 10, color: '#64748B' }}>Mortgage</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#F87171' }}>{formatCurrency(debt)}</span>
        </div>
      </div>

      {appreciation !== 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#64748B' }}>Market Value: <b style={{ color: '#94A3B8' }}>{formatCurrency(marketValue)}</b></span>
          <span style={{ fontSize: 10, color: '#64748B' }}>vs Purchase: <b style={{ color: appreciation >= 0 ? '#00D28E' : '#F87171' }}>{appreciation >= 0 ? '+' : ''}{formatCurrency(appreciation)}</b></span>
        </div>
      )}
    </div>
  );
}

// ── F: Market Appreciation ──────────────────────────────────────────────────
function MarketAppreciation({ propertyId, purchasePrice }) {
  const { history, loading } = useRentalHistory(propertyId);

  const chartData = useMemo(() => (
    [...history]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(h => ({
        date:  h.date,
        value: Number(h.market_value),
        label: new Date(h.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      }))
  ), [history]);

  const purchase   = Number(purchasePrice) || 0;
  const currentVal = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const gained     = purchase > 0 ? currentVal - purchase : 0;

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Market Appreciation</p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#475569' }}>Property value over time</p>
        </div>
        {purchase > 0 && gained !== 0 && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: gained >= 0 ? '#00D28E' : '#F87171', letterSpacing: '-0.02em' }}>
              {gained >= 0 ? '+' : ''}{formatCurrency(gained)}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 9, color: '#64748B' }}>vs purchase price</p>
          </div>
        )}
      </div>
      <div style={{ height: 240 }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>Loading…</div>
        ) : chartData.length < 2 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 12, textAlign: 'center', padding: '0 24px' }}>
            Add more snapshots in Financial History to see the appreciation trend
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00D28E" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#00D28E" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(51,65,85,0.35)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const diff = purchase > 0 ? d.value - purchase : null;
                return (
                  <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <p style={{ margin: 0, color: '#64748B', fontSize: 10 }}>{d.date}</p>
                    <p style={{ margin: '4px 0 0', color: '#00D28E', fontWeight: 700 }}>{formatCurrency(d.value)}</p>
                    {diff !== null && <p style={{ margin: '2px 0 0', color: diff >= 0 ? '#00D28E' : '#F87171', fontSize: 10 }}>{diff >= 0 ? '+' : ''}{formatCurrency(diff)} vs purchase</p>}
                  </div>
                );
              }} />
              {purchase > 0 && (
                <ReferenceLine y={purchase} stroke="#475569" strokeDasharray="4 4"
                  label={{ value: 'Purchase', position: 'insideTopLeft', fill: '#64748B', fontSize: 9 }} />
              )}
              <Area type="monotone" dataKey="value" name="Market Value"
                stroke="#00D28E" strokeWidth={2.5} fill="url(#appGrad)"
                dot={chartData.length <= 10 ? { fill: '#00D28E', r: 3, strokeWidth: 0 } : false}
                activeDot={{ fill: '#00D28E', r: 5, strokeWidth: 0 }}
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function RentalCharts({ property }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      <CashFlowWaterfall property={property} />
      <ExpenseDonut propertyId={property.id} />
      <EquityDebtStack property={property} />
      <MarketAppreciation propertyId={property.id} purchasePrice={property.purchase_price} />
    </div>
  );
}
