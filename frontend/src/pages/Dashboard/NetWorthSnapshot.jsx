import { useDashboard } from '../../hooks/useDashboard';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

const COLORS = {
  Assets: '#10b981',
  Liabilities: '#ef4444',
};

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="bg-white border border-gray-100 shadow-md rounded-lg px-3 py-2 text-sm">
        <p className="font-semibold text-gray-700">{name}</p>
        <p className="text-gray-600">{formatCurrency(value)}</p>
      </div>
    );
  }
  return null;
}

function CenterLabel({ cx, cy, netWorth }) {
  const isNegative = netWorth < 0;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#6b7280" fontSize={11} fontWeight={500}>
        Net Worth
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fill={isNegative ? '#ef4444' : '#111827'}
        fontSize={15}
        fontWeight={700}
      >
        {formatCurrency(Math.abs(netWorth))}
      </text>
      {isNegative && (
        <text x={cx} y={cy + 30} textAnchor="middle" fill="#ef4444" fontSize={10}>
          (negative)
        </text>
      )}
    </g>
  );
}

export default function NetWorthSnapshot() {
  const { netWorthSnapshot } = useDashboard();

  const totalAssets = Number(netWorthSnapshot.totalAssets) || 0;
  const totalLiabilities = Number(netWorthSnapshot.totalLiabilities) || 0;
  const netWorth = Number(netWorthSnapshot.netWorth) || 0;

  const donutData = [
    { name: 'Assets', value: totalAssets },
    { name: 'Liabilities', value: totalLiabilities },
  ].filter(d => d.value > 0);

  const isEmpty = totalAssets === 0 && totalLiabilities === 0;

  // For the center label we need the chart center coordinates
  const renderCustomLabel = ({ cx, cy }) => (
    <CenterLabel cx={cx} cy={cy} netWorth={netWorth} />
  );

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Net Worth Snapshot</h3>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center bg-emerald-50 rounded-lg p-2">
          <p className="text-xs font-medium text-emerald-600">Assets</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="text-center bg-red-50 rounded-lg p-2">
          <p className="text-xs font-medium text-red-500">Liabilities</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{formatCurrency(totalLiabilities)}</p>
        </div>
        <div className={`text-center rounded-lg p-2 ${netWorth >= 0 ? 'bg-primary-50' : 'bg-red-50'}`}>
          <p className={`text-xs font-medium ${netWorth >= 0 ? 'text-primary-600' : 'text-red-500'}`}>Net Worth</p>
          <p className={`text-sm font-bold mt-0.5 ${netWorth >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {formatCurrency(netWorth)}
          </p>
        </div>
      </div>

      {/* Donut chart */}
      <div className="flex-grow" style={{ minHeight: 220 }}>
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="78%"
                paddingAngle={donutData.length > 1 ? 3 : 0}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={800}
              >
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
