import { useDashboard } from '../../hooks/useDashboard';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

const COLORS = { Assets: '#00D28E', Liabilities: '#EF4444' };

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '8px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>{name}</p>
        <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>{formatCurrency(value)}</p>
      </div>
    );
  }
  return null;
}

function CenterLabel({ cx, cy, netWorth }) {
  const isNegative = netWorth < 0;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#64748B" fontSize={11} fontWeight={500}>
        Net Worth
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle"
        fill={isNegative ? '#EF4444' : '#00D28E'}
        fontSize={14} fontWeight={700}
      >
        {formatCurrency(Math.abs(netWorth))}
      </text>
      {isNegative && (
        <text x={cx} y={cy + 30} textAnchor="middle" fill="#EF4444" fontSize={10}>(negative)</text>
      )}
    </g>
  );
}

export default function NetWorthSnapshot() {
  const { netWorthSnapshot } = useDashboard();
  const totalAssets      = Number(netWorthSnapshot.totalAssets) || 0;
  const totalLiabilities = Number(netWorthSnapshot.totalLiabilities) || 0;
  const netWorth         = Number(netWorthSnapshot.netWorth) || 0;

  const donutData = [
    { name: 'Assets', value: totalAssets },
    { name: 'Liabilities', value: totalLiabilities },
  ].filter(d => d.value > 0);

  const isEmpty = totalAssets === 0 && totalLiabilities === 0;
  const renderCustomLabel = ({ cx, cy }) => <CenterLabel cx={cx} cy={cy} netWorth={netWorth} />;

  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 16, padding: '20px 24px', boxShadow: '0 0 24px rgba(0,210,142,0.08)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>Net Worth Snapshot</h3>

      {/* Summary pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div style={{ textAlign: 'center', background: 'rgba(0,210,142,0.08)', border: '1px solid rgba(0,210,142,0.15)', borderRadius: 10, padding: '10px 6px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#00D28E', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assets</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', margin: '4px 0 0' }}>{formatCurrency(totalAssets)}</p>
        </div>
        <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 6px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Liabilities</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', margin: '4px 0 0' }}>{formatCurrency(totalLiabilities)}</p>
        </div>
        <div style={{ textAlign: 'center', background: netWorth >= 0 ? 'rgba(0,210,142,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${netWorth >= 0 ? 'rgba(0,210,142,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 10, padding: '10px 6px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: netWorth >= 0 ? '#00D28E' : '#EF4444', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Worth</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', margin: '4px 0 0' }}>{formatCurrency(netWorth)}</p>
        </div>
      </div>

      {/* Donut */}
      <div style={{ flex: 1, minHeight: 200 }}>
        {isEmpty ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13 }}>No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius="55%" outerRadius="78%"
                paddingAngle={donutData.length > 1 ? 3 : 0} dataKey="value"
                labelLine={false} label={renderCustomLabel}
                animationBegin={0} animationDuration={800}
              >
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8}
                formatter={(val) => <span style={{ fontSize: 11, color: '#94A3B8' }}>{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
