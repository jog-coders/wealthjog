import { useNavigate } from 'react-router-dom';
import { useBudget } from '../../hooks/useBudget';
import { useIncome } from '../../hooks/useIncome';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import { getCategoryColor } from '../../utils/categoryColors';

export default function SummaryStep() {
  const navigate = useNavigate();
  const { summary, lineItems } = useBudget();
  const { totals: incomeTotals } = useIncome();

  const monthlyNetIncome = incomeTotals.monthlyTotal || 0;
  
  const fixedItems = lineItems.fixed_monthly || [];
  const fixedMonthly = fixedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  
  const guiltFreeMonthly = summary.guiltFreeSpent || 0;
  const annualProrated = (summary.annualTotal || 0) / 12;
  
  const totalAllocated = fixedMonthly + guiltFreeMonthly + annualProrated;
  const actualBuffer = monthlyNetIncome - totalAllocated;
  
  const isSurplus = actualBuffer > 0;
  const isDeficit = actualBuffer < 0;
  const isZero = actualBuffer === 0;

  const pieData = [
    { name: 'Annual (Prorated)', value: annualProrated, color: getCategoryColor('Annual') },
    { name: 'Fixed Monthly', value: fixedMonthly, color: getCategoryColor('Fixed') },
    { name: 'Guilt-Free', value: guiltFreeMonthly, color: getCategoryColor('Guilt-Free') },
  ].filter(item => item.value > 0);

  if (isSurplus) {
    pieData.push({ name: 'Unallocated Surplus', value: actualBuffer, color: getCategoryColor('Buffer') });
  }

  const listData = [
    { name: 'Annual (Prorated)', value: annualProrated, color: getCategoryColor('Annual') },
    { name: 'Fixed Monthly', value: fixedMonthly, color: getCategoryColor('Fixed') },
    { name: 'Guilt-Free', value: guiltFreeMonthly, color: getCategoryColor('Guilt-Free') },
  ];

  if (isSurplus) {
    listData.push({ name: 'Unallocated Surplus', value: actualBuffer, color: getCategoryColor('Buffer'), isProminent: true, textColor: 'text-green-600', borderColor: 'border-green-200' });
  } else if (isDeficit) {
    listData.push({ name: 'Budget Deficit', value: Math.abs(actualBuffer), color: '#ef4444', isProminent: true, textColor: 'text-red-600', borderColor: 'border-red-200', isNegative: true });
  } else {
    listData.push({ name: 'Unallocated Surplus', value: 0, color: getCategoryColor('Buffer'), isProminent: true, textColor: 'text-gray-500', borderColor: 'border-gray-200' });
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percent = monthlyNetIncome > 0 ? (data.value / monthlyNetIncome) * 100 : 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded">
          <p className="font-semibold" style={{ color: data.color }}>{data.name}</p>
          <p className="text-gray-900">{formatCurrency(data.value)} / mo</p>
          <p className="text-sm text-gray-500">{percent.toFixed(1)}% of Net Income</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="text-center py-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
        <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
        Budget Complete!
      </h2>
      <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto mb-10">
        You've successfully allocated your monthly cash flow. Here is a holistic view of how every dollar of your net income is put to work each month.
      </p>

      {isSurplus && (
        <div className="rounded-lg bg-green-50 p-4 mb-8 max-w-4xl mx-auto border border-green-200 text-left">
          <p className="text-green-800 font-medium">🎉 Excellent job! You have a monthly surplus of <strong>{formatCurrency(actualBuffer)}</strong>. Consider investing it or adding to your savings!</p>
        </div>
      )}
      {isZero && (
        <div className="rounded-lg bg-primary-50 p-4 mb-8 max-w-4xl mx-auto border border-blue-200 text-left">
          <p className="text-primary-800 font-medium">⚖️ Perfectly balanced! Every dollar has a job—your budget is a Zero-Based masterpiece.</p>
        </div>
      )}
      {isDeficit && (
        <div className="rounded-lg bg-red-50 p-4 mb-8 max-w-4xl mx-auto border border-red-200 text-left">
          <p className="text-red-800 font-medium">⚠️ Warning: You are over budget by <strong>{formatCurrency(Math.abs(actualBuffer))}</strong>. You may need to reduce your Guilt-Free or Fixed expenses to balance your cash flow.</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-8 mb-10 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center border border-gray-200">
        
        <div className="h-64 sm:h-80">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">No allocations to display</div>
          )}
        </div>

        <div className="space-y-4 text-left">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Monthly Overview</h3>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium">Net Income:</span>
            <span className="text-gray-900 font-bold">{formatCurrency(monthlyNetIncome)}</span>
          </div>
          
          <div className="pt-2 space-y-3">
            {listData.map(item => (
              <div 
                key={item.name} 
                className={`flex justify-between items-center text-sm ${
                  item.isProminent ? `animate-pulse font-bold bg-white p-3 rounded-lg border ${item.borderColor}` : 'py-1'
                }`}
              >
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                  <span className={item.textColor || 'text-gray-600'}>{item.name}</span>
                </div>
                <span className={item.textColor || 'text-gray-900 font-medium'}>
                  {item.isNegative ? '-' : ''}{formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-gray-900 font-bold">Total Allocated:</span>
            <span className="text-gray-900 font-bold">{formatCurrency(totalAllocated)}</span>
          </div>
        </div>

      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-lg bg-primary-500 px-6 py-3 text-base font-semibold text-white hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => navigate('/assets')}
          className="rounded-lg bg-white px-6 py-3 text-base font-semibold text-gray-900 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
        >
          Manage Assets
        </button>
      </div>
    </div>
  );
}
