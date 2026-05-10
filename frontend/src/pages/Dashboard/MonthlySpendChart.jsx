import { useDashboard } from '../../hooks/useDashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getCategoryColorMap } from '../../utils/categoryColors';
import { formatCurrency } from '../../utils/formatCurrency';

export default function MonthlySpendChart() {
  const { monthlySpend } = useDashboard();

  const categoriesSet = new Set();
  monthlySpend.forEach(monthData => {
    Object.keys(monthData).forEach(key => { if (key !== 'month') categoriesSet.add(key); });
  });
  const allCategories = Array.from(categoriesSet);
  const colorMap = getCategoryColorMap(allCategories);

  const DarkTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, e) => sum + e.value, 0);
      return (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', fontSize: 12 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#F8FAFC' }}>{label}</p>
          {payload.map((entry, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '1px 0', color: '#94A3B8' }}>
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span style={{ fontWeight: 600, color: '#F8FAFC' }}>{formatCurrency(entry.value)}</span>
            </div>
          ))}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#F8FAFC' }}>
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>Monthly Spend by Category</h3>

      <div style={{ height: 260 }}>
        {monthlySpend.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13, textAlign: 'center' }}>
            No expenses found for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySpend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(51,65,85,0.5)" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              {allCategories.map(category => (
                <Bar key={category} dataKey={category} stackId="a" fill={colorMap[category] || '#8884d8'} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
