import { useDashboard } from '../../hooks/useDashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

export default function NetWorthHistory() {
  const { netWorthHistory } = useDashboard();

  const formattedData = netWorthHistory.map(item => ({
    date: new Date(item.snapshot_date).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
    netWorth: Number(item.net_worth) || 0
  }));

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Net Worth Trend</h3>
      
      <div className="flex-grow h-64 min-h-[16rem]">
        {formattedData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
            <p>No historical data yet.</p>
            <p>A snapshot is taken automatically when you update your assets or liabilities.</p>
          </div>
        ) : formattedData.length === 1 ? (
          <div className="h-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...formattedData, { ...formattedData[0], date: 'Now' }]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="netWorth" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 pointer-events-none">
              <span className="bg-primary-50 text-blue-700 px-3 py-1 rounded text-sm">Track more data over time to see the trend.</span>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(val) => `$${val/1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="netWorth" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
