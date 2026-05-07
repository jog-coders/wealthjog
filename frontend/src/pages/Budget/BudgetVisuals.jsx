import { useBudget } from '../../hooks/useBudget';
import { useIncome } from '../../hooks/useIncome';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getCategoryColorMap, getCategoryColor } from '../../utils/categoryColors';
import { formatCurrency } from '../../utils/formatCurrency';
// Instead, income array from backend already has raw amount and frequency. I'll just map them.
// Let me recreate a simple local normalize to Monthly
const normalizeToMonthly = (amount, frequency) => {
  const val = Number(amount) || 0;
  if (frequency === 'Annual') return val / 12;
  if (frequency === 'Biweekly') return (val * 26) / 12;
  return val; // Monthly
};

const consolidatePieData = (data, thresholdPercent = 0.05) => {
  if (!data || data.length === 0) return [];
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return data;

  let consolidatedData = [];
  let otherTotal = 0;

  data.forEach(item => {
    if (item.value / total < thresholdPercent) {
      otherTotal += item.value;
    } else {
      consolidatedData.push(item);
    }
  });

  if (otherTotal > 0) {
    consolidatedData.push({ name: 'Other (Combined)', value: otherTotal });
  }

  consolidatedData.sort((a, b) => {
    if (a.name === 'Other (Combined)') return 1;
    if (b.name === 'Other (Combined)') return -1;
    return b.value - a.value;
  });

  return consolidatedData;
};

export default function BudgetVisuals({ currentStep }) {
  const { summary, lineItems } = useBudget();
  const { income, totals: incomeTotals } = useIncome();

  const annualIncome = incomeTotals.annualTotal || 0;
  const monthlyIncome = incomeTotals.monthlyTotal || 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded">
          <p className="font-semibold">{label || payload[0].name}</p>
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

  const renderVisuals = () => {
    let barData = [];
    let pieData = [];
    let titleBar = '';
    let titlePie = '';
    let barKeys = [];
    let stackedBar = false;
    
    // Fallback safely to empty arrays
    const annualItems = lineItems.annual || [];
    const fixedItems = lineItems.fixed_monthly || [];
    const guiltItems = lineItems.guilt_free || [];

    switch (currentStep) {
      case 0: // Income
        titleBar = 'Gross vs Net Breakdown (Monthly)';
        titlePie = 'Income Streams (Monthly)';
        
        let monthlyRetirement = 0;
        let monthlyDeductions = 0;
        let monthlyNet = 0;

        income.forEach(i => {
           monthlyRetirement += normalizeToMonthly(i.retirement_savings, i.frequency);
           monthlyDeductions += normalizeToMonthly(i.other_deductions, i.frequency);
           monthlyNet += normalizeToMonthly(i.amount, i.frequency);
        });
        
        barData = [{
           name: 'Overview',
           'Net Income': monthlyNet,
           'Retirement Savings': monthlyRetirement,
           'Other Deductions': monthlyDeductions
        }];
        barKeys = ['Net Income', 'Retirement Savings', 'Other Deductions'];
        stackedBar = true;
        
        pieData = income.map(i => ({
          name: i.name,
          value: normalizeToMonthly(i.amount, i.frequency)
        }));
        
        return { titleBar, titlePie, barData, pieData, barKeys, singleBar: false, stackedBar };

      case 1: // Annual Budget
        titleBar = 'Annual Tracking Overview';
        titlePie = 'Annual Budget Breakdown';
        
        barData = [{
          name: 'Overview',
          'Annual Net Income': annualIncome,
          'Annual Budget Total': summary.annualTotal || 0,
        }];
        barKeys = ['Annual Net Income', 'Annual Budget Total'];
        
        pieData = annualItems.filter(i => i.category).map(i => ({
          name: i.category, value: Number(i.amount) || 0
        }));
        break;

      case 2: // Fixed Monthly
        titleBar = 'Fixed vs Available Cash Flow';
        titlePie = 'Fixed Monthly Breakdown';
        
        pieData = fixedItems.filter(i => i.category).map(i => ({
          name: i.category, value: Number(i.amount) || 0
        }));

        const annualProrated = (summary.annualTotal || 0) / 12;
        const fixedTotal = pieData.reduce((sum, item) => sum + item.value, 0);
        const remaining = Math.max(0, monthlyIncome - annualProrated - fixedTotal);

        barData = [{
          name: 'Monthly Net Income',
          'Annual Budget (Prorated)': annualProrated,
          'Fixed Monthly Expenses': fixedTotal,
          'Remaining Available': remaining,
        }];
        barKeys = ['Annual Budget (Prorated)', 'Fixed Monthly Expenses', 'Remaining Available'];
        stackedBar = true;
        break;

      case 3: // Guilt-Free
        titleBar = 'Discretionary Allocation';
        titlePie = 'Guilt-Free Breakdown';
        
        pieData = guiltItems.filter(i => i.category).map(i => ({
          name: i.category, value: Number(i.amount) || 0
        }));

        const fixedTotalForGF = fixedItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const availableForGuiltFree = monthlyIncome - fixedTotalForGF - ((summary.annualTotal || 0) / 12);
        const guiltFreeAllocated = pieData.reduce((sum, item) => sum + item.value, 0);

        barData = [{
          name: 'Monthly Overview',
          'Available Cash Flow': Math.max(0, availableForGuiltFree),
          'Guilt-Free Allocated': guiltFreeAllocated,
        }];
        barKeys = ['Available Cash Flow', 'Guilt-Free Allocated'];
        stackedBar = true;
        break;

      default:
        return null;
    }
    
    // Apply consolidation to whatever pieData was generated
    pieData = consolidatePieData(pieData);

    return { titleBar, titlePie, barData, pieData, barKeys, singleBar: false, stackedBar };
  };

  const visuals = renderVisuals();
  if (!visuals) return null;

  const { titleBar, titlePie, barData, pieData, barKeys, singleBar, stackedBar } = visuals;
  
  const allPieNames = pieData.map(d => d.name);
  const colorMap = getCategoryColorMap(allPieNames);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* Bar Chart Section */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{titleBar}</h3>
        <div className="h-80">
          {barData.length === 0 ? (
             <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                {singleBar ? (
                   <Bar dataKey="value" fill="#3b82f6" />
                ) : (
                  <>
                    <Legend />
                    {barKeys.map(key => (
                       <Bar key={key} dataKey={key} stackId={stackedBar ? "a" : undefined} fill={getCategoryColor(key)} />
                    ))}
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie Chart Section */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{titlePie}</h3>
        <div className="h-80">
          {pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">No breakdown available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colorMap[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
