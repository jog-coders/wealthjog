import { useBudget } from '../../hooks/useBudget';
import { useIncome } from '../../hooks/useIncome';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Label,
} from 'recharts';
import { getCategoryColorMap, getCategoryColor, PALETTE } from '../../utils/categoryColors';
import { formatCurrency } from '../../utils/formatCurrency';

const normalizeToMonthly = (amount, frequency) => {
  const val = Number(amount) || 0;
  if (frequency === 'Annual')   return val / 12;
  if (frequency === 'Biweekly') return (val * 26) / 12;
  return val;
};

const consolidatePieData = (data, thresholdPercent = 0.05) => {
  if (!data || data.length === 0) return [];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return data;
  let result = [];
  let otherTotal = 0;
  data.forEach(item => {
    if (item.value / total < thresholdPercent) otherTotal += item.value;
    else result.push(item);
  });
  if (otherTotal > 0) result.push({ name: 'Other', value: otherTotal });
  return result.sort((a, b) => {
    if (a.name === 'Other') return 1;
    if (b.name === 'Other') return -1;
    return b.value - a.value;
  });
};

// ── Dark tooltip ──────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', fontSize: 12,
    }}>
      {label && <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text-1)' }}>{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, margin: '2px 0' }}>
          <span style={{ color: entry.color }}>{entry.name || payload[0].name}:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Gradient IDs for bar keys ─────────────────────────────────────────────────
function buildBarGradients(keys) {
  return keys.map((key, i) => {
    const color = getCategoryColor(key);
    const id = `budgetBar${i}`;
    return { key, id, color };
  });
}

// ── Donut center label (used via recharts <Label> inside <Pie>) ───────────────
function DonutCenter({ viewBox, total }) {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#64748B" fontSize={10} fontWeight={600} letterSpacing="0.05em">
        TOTAL
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#F8FAFC" fontSize={14} fontWeight={800}>
        {formatCurrency(total)}
      </text>
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BudgetVisuals({ currentStep }) {
  const { summary, lineItems } = useBudget();
  const { income, totals: incomeTotals } = useIncome();

  const annualIncome  = incomeTotals.annualTotal  || 0;
  const monthlyIncome = incomeTotals.monthlyTotal || 0;

  const renderVisuals = () => {
    let barData = [], pieData = [], titleBar = '', titlePie = '', barKeys = [], stackedBar = false;
    const annualItems = lineItems.annual        || [];
    const fixedItems  = lineItems.fixed_monthly || [];
    const guiltItems  = lineItems.guilt_free    || [];

    switch (currentStep) {
      case 0: {
        titleBar = 'Gross vs Net Breakdown (Monthly)';
        titlePie = 'Income Streams (Monthly)';
        let monthlyRetirement = 0, monthlyDeductions = 0, monthlyNet = 0;
        income.forEach(i => {
          monthlyRetirement += normalizeToMonthly(i.retirement_savings, i.frequency);
          monthlyDeductions += normalizeToMonthly(i.other_deductions, i.frequency);
          monthlyNet        += normalizeToMonthly(i.amount, i.frequency);
        });
        barData = [{ name: 'Overview', 'Net Income': monthlyNet, 'Retirement Savings': monthlyRetirement, 'Other Deductions': monthlyDeductions }];
        barKeys = ['Net Income', 'Retirement Savings', 'Other Deductions'];
        stackedBar = true;
        pieData = income.map(i => ({ name: i.name, value: normalizeToMonthly(i.amount, i.frequency) }));
        return { titleBar, titlePie, barData, pieData: consolidatePieData(pieData), barKeys, stackedBar };
      }
      case 1: {
        titleBar = 'Annual Tracking Overview';
        titlePie = 'Annual Budget Breakdown';
        barData = [{ name: 'Overview', 'Annual Net Income': annualIncome, 'Annual Budget Total': summary.annualTotal || 0 }];
        barKeys = ['Annual Net Income', 'Annual Budget Total'];
        pieData = annualItems.filter(i => i.category).map(i => ({ name: i.category, value: Number(i.amount) || 0 }));
        break;
      }
      case 2: {
        titleBar = 'Fixed vs Available Cash Flow';
        titlePie = 'Fixed Monthly Breakdown';
        pieData = fixedItems.filter(i => i.category).map(i => ({ name: i.category, value: Number(i.amount) || 0 }));
        const annualProrated = (summary.annualTotal || 0) / 12;
        const fixedTotal = pieData.reduce((s, d) => s + d.value, 0);
        const remaining  = Math.max(0, monthlyIncome - annualProrated - fixedTotal);
        barData = [{ name: 'Monthly Net Income', 'Annual Budget (Prorated)': annualProrated, 'Fixed Monthly Expenses': fixedTotal, 'Remaining Available': remaining }];
        barKeys = ['Annual Budget (Prorated)', 'Fixed Monthly Expenses', 'Remaining Available'];
        stackedBar = true;
        break;
      }
      case 3: {
        titleBar = 'Discretionary Allocation';
        titlePie = 'Guilt-Free Breakdown';
        pieData = guiltItems.filter(i => i.category).map(i => ({ name: i.category, value: Number(i.amount) || 0 }));
        const fixedTotalForGF      = fixedItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const availableForGuiltFree = monthlyIncome - fixedTotalForGF - ((summary.annualTotal || 0) / 12);
        const guiltFreeAllocated    = pieData.reduce((s, d) => s + d.value, 0);
        barData = [{ name: 'Monthly Overview', 'Available Cash Flow': Math.max(0, availableForGuiltFree), 'Guilt-Free Allocated': guiltFreeAllocated }];
        barKeys = ['Available Cash Flow', 'Guilt-Free Allocated'];
        stackedBar = true;
        break;
      }
      default:
        return null;
    }

    return { titleBar, titlePie, barData, pieData: consolidatePieData(pieData), barKeys, stackedBar };
  };

  const visuals = renderVisuals();
  if (!visuals) return null;

  const { titleBar, titlePie, barData, pieData, barKeys, stackedBar } = visuals;
  const barGrads  = buildBarGradients(barKeys);
  const allPieNames = pieData.map(d => d.name);
  const colorMap    = getCategoryColorMap(allPieNames);
  const pieTotal    = pieData.reduce((s, d) => s + d.value, 0);

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: '20px 22px',
    boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 10px 24px rgba(15,23,42,0.08)',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* ── Gradient Bar Chart ── */}
      <div style={cardStyle}>
        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{titleBar}</p>
        <p style={{ margin: '0 0 18px', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em' }}>Monthly breakdown · hover for details</p>
        <div style={{ height: 300 }}>
          {barData.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                <defs>
                  {barGrads.map(({ id, color }) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={color} stopOpacity={0.95} />
                      <stop offset="60%"  stopColor={color} stopOpacity={0.65} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.25} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(51,65,85,0.35)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} width={46} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-2)', paddingTop: 10 }} iconType="circle" iconSize={7} />
                {barGrads.map(({ key, id }, idx) => {
                  const isTop = stackedBar ? idx === barGrads.length - 1 : true;
                  return (
                    <Bar key={key} dataKey={key} stackId={stackedBar ? 'a' : undefined}
                      fill={`url(#${id})`}
                      radius={isTop ? [7, 7, 0, 0] : [0, 0, 0, 0]}
                      stroke="none"
                      animationDuration={700}
                      animationEasing="ease-out"
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Gradient Donut Chart ── */}
      <div style={cardStyle}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{titlePie}</p>
        <p style={{ margin: '0 0 16px', fontSize: 10, color: 'var(--text-3)' }}>Proportional breakdown by category</p>
        <div style={{ height: 300 }}>
          {pieData.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>No breakdown available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {pieData.map((entry, i) => {
                    const color = colorMap[entry.name] || PALETTE[i % PALETTE.length];
                    const id = `pieGrad${i}`;
                    return (
                      <radialGradient key={id} id={id} cx="40%" cy="40%" r="60%">
                        <stop offset="0%"   stopColor={color} stopOpacity={1}  />
                        <stop offset="100%" stopColor={color} stopOpacity={0.6}/>
                      </radialGradient>
                    );
                  })}
                </defs>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius="52%" outerRadius="78%"
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  animationBegin={0} animationDuration={700}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={`url(#pieGrad${i})`}
                      stroke="rgba(15,23,42,0.4)" strokeWidth={1}
                    />
                  ))}
                  <Label content={<DonutCenter total={pieTotal} />} position="center" />
                </Pie>
                <Tooltip content={<DarkTooltip />} />
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: 'var(--text-2)', paddingTop: 4 }}
                  formatter={(val) => <span style={{ color: 'var(--text-2)' }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
