import { useDashboard } from '../../hooks/useDashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import { getCategoryColor } from '../../utils/categoryColors';

export default function NetWorthSnapshot() {
  const { netWorthSnapshot } = useDashboard();

  const totalAssets = Number(netWorthSnapshot.totalAssets) || 0;
  const totalLiabilities = Number(netWorthSnapshot.totalLiabilities) || 0;
  const netWorth = Number(netWorthSnapshot.netWorth) || 0;

  const barData = [
    {
      name: 'Snapshot',
      Assets: totalAssets,
      Liabilities: -totalLiabilities
    }
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Net Worth Snapshot</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">Assets</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">Liabilities</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalLiabilities)}</p>
        </div>
        <div className="text-center bg-primary-50 rounded p-2 border border-blue-100">
          <p className="text-sm font-medium text-primary-500">Net Worth</p>
          <p className={`text-xl font-bold ${netWorth >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {formatCurrency(netWorth)}
          </p>
        </div>
      </div>

      <div className="flex-grow h-64">
        {totalAssets === 0 && totalLiabilities === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis tickFormatter={(val) => `$${Math.abs(val)/1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(Math.abs(value))} />
              <Bar dataKey="Assets" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} barSize={60} />
              <Bar dataKey="Liabilities" fill="#ef4444" stackId="a" radius={[0, 0, 4, 4]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
