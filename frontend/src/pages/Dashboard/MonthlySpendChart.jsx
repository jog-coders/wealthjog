import { useDashboard } from '../../hooks/useDashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getCategoryColorMap } from '../../utils/categoryColors';
import { formatCurrency } from '../../utils/formatCurrency';

export default function MonthlySpendChart() {
  const { monthlySpend } = useDashboard();

  // Extract all unique categories to know which bars to render
  const categoriesSet = new Set();
  monthlySpend.forEach(monthData => {
    Object.keys(monthData).forEach(key => {
      if (key !== 'month') categoriesSet.add(key);
    });
  });
  const allCategories = Array.from(categoriesSet);
  const colorMap = getCategoryColorMap(allCategories);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + entry.value, 0);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded text-sm">
          <p className="font-semibold mb-2 border-b pb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between gap-4 py-0.5">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
          <div className="mt-2 pt-1 border-t border-gray-100 flex justify-between font-bold">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Spend by Category</h3>
      
      <div className="flex-grow h-64 min-h-[16rem]">
        {monthlySpend.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center">
            No expenses found for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySpend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(val) => `$${val/1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
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
