import { useAssets } from '../../hooks/useAssets';
import { useLiabilities } from '../../hooks/useLiabilities';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getCategoryColorMap, getCategoryColor } from '../../utils/categoryColors';
import { formatCurrency } from '../../utils/formatCurrency';

export default function AssetsLiabilitiesVisuals() {
  const { currentAssets: assets = [], total: totalAssets } = useAssets();
  const { currentLiabilities: liabilities = [], total: totalLiabilities } = useLiabilities();

  const netWorth = totalAssets - totalLiabilities;

  const barData = [
    {
      name: 'Net Worth',
      'Total Assets': totalAssets,
      'Total Liabilities': totalLiabilities
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const assetTypes = [...new Set(assets.map(a => a.type).filter(Boolean))];
  const liabilityTypes = [...new Set(liabilities.map(l => l.type).filter(Boolean))];
  const allTypes = [...new Set([...assetTypes, ...liabilityTypes])];
  const colorMap = getCategoryColorMap(allTypes);

  // Group by type for pies
  const assetsByType = assets.reduce((acc, curr) => {
    const type = curr.type || 'Other';
    acc[type] = (acc[type] || 0) + (Number(curr.amount) || 0);
    return acc;
  }, {});

  const liabilitiesByType = liabilities.reduce((acc, curr) => {
    const type = curr.type || 'Other';
    acc[type] = (acc[type] || 0) + (Number(curr.amount) || 0);
    return acc;
  }, {});

  const assetPieData = Object.entries(assetsByType).map(([name, value]) => ({ name, value }));
  const liabilityPieData = Object.entries(liabilitiesByType).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <div className="bg-primary-50 rounded-lg p-6 flex flex-col items-center justify-center border border-blue-100">
        <h3 className="text-sm font-medium text-primary-500 uppercase tracking-wide">Net Worth</h3>
        <p className={`text-4xl font-bold mt-2 ${netWorth >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
          {formatCurrency(netWorth)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 h-80">
          <h4 className="text-center font-medium text-gray-700 mb-4">Assets vs Liabilities</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(val) => `$${val/1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Total Assets" fill={getCategoryColor('Total Assets')} />
              <Bar dataKey="Total Liabilities" fill={getCategoryColor('Total Liabilities')} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-1 h-80">
          <h4 className="text-center font-medium text-gray-700 mb-4">Asset Distribution</h4>
          {assetPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {assetPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colorMap[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>

        <div className="lg:col-span-1 h-80">
          <h4 className="text-center font-medium text-gray-700 mb-4">Liability Distribution</h4>
          {liabilityPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={liabilityPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {liabilityPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colorMap[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>

      </div>
    </div>
  );
}
