import { useDashboard } from '../../hooks/useDashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, defs, linearGradient, stop } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

function DarkTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '8px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{label}</p>
        <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 700, color: '#00D28E' }}>{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function NetWorthHistory() {
  const { netWorthHistory } = useDashboard();

  const formattedData = netWorthHistory.map(item => ({
    date: new Date(item.snapshot_date).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
    netWorth: Number(item.net_worth) || 0
  }));

  const cardStyle = {
    background: '#1E293B', border: '1px solid #334155', borderRadius: 16,
    padding: '20px 24px',
    boxShadow: '0 0 24px rgba(0,210,142,0.06)',
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>Net Worth Trend</h3>

      <div style={{ height: 260, position: 'relative' }}>
        {formattedData.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#64748B', fontSize: 13, textAlign: 'center' }}>
            <p style={{ margin: 0 }}>No historical data yet.</p>
            <p style={{ margin: 0, fontSize: 11 }}>A snapshot is taken when you update assets or liabilities.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData.length === 1 ? [...formattedData, { ...formattedData[0], date: 'Now' }] : formattedData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D28E" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00D28E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="netWorth" stroke="#00D28E" strokeWidth={2.5}
                fill="url(#greenGradient)" dot={{ r: 3, fill: '#00D28E', stroke: '#0F172A', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#00D28E', stroke: '#0F172A', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {formattedData.length === 1 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ background: 'rgba(0,210,142,0.12)', color: '#00D28E', border: '1px solid rgba(0,210,142,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 11 }}>
              Track more data to see trend
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
