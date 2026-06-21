import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const equityPct = data.value > 0 ? ((data.equity / data.value) * 100).toFixed(1) : 0;
    const mortgagePct = data.value > 0 ? ((data.mortgage / data.value) * 100).toFixed(1) : 0;
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 shadow-xl text-sm space-y-2">
        <p className="font-bold text-text-1">{data.name}</p>
        <div className="border-t border-[#334155] my-2" />
        <div className="flex justify-between gap-8 text-text-2">
          <span>Current Value:</span>
          <span className="font-semibold text-text-1">{formatCurrency(data.value)}</span>
        </div>
        <div className="flex justify-between gap-8 text-text-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D28E]" /> Equity:
          </span>
          <span className="font-semibold text-green">{formatCurrency(data.equity)} ({equityPct}%)</span>
        </div>
        <div className="flex justify-between gap-8 text-text-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Mortgage Debt:
          </span>
          <span className="font-semibold text-[#EF4444]">{formatCurrency(data.mortgage)} ({mortgagePct}%)</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function RentalPortfolioDashboard({ rentals = [] }) {
  const {
    totalValue,
    totalMortgage,
    totalEquity,
    totalRent,
    totalCashFlow,
    chartData,
    tableData
  } = useMemo(() => {
    let valSum = 0;
    let mortSum = 0;
    let rentSum = 0;
    let cashFlowSum = 0;

    const items = rentals.map(r => {
      const val = Number(r.current_market_value) || 0;
      const debt = Number(r.mortgage_balance) || 0;
      const eq = Math.max(0, val - debt);
      const rent = Number(r.rent) || 0;
      const pmFees = Number(r.property_management_fees) || 0;
      const mortAmt = (Number(r.mortgage_pi) || 0) + (Number(r.mortgage_escrow) || 0);
      const cashFlow = rent - (pmFees + mortAmt);

      valSum += val;
      mortSum += debt;
      rentSum += rent;
      cashFlowSum += cashFlow;

      return {
        id: r.id,
        name: r.property_name || 'Unnamed Property',
        equity: eq,
        mortgage: debt,
        value: val,
        rent,
        cashFlow,
        ltv: val > 0 ? (debt / val) * 100 : 0
      };
    });

    const netWorth = Math.max(0, valSum - mortSum);

    // Build chart data
    const chart = items.map(item => ({
      name: item.name,
      equity: item.equity,
      mortgage: item.mortgage,
      value: item.value
    }));

    if (items.length > 0) {
      chart.push({
        name: 'Total Portfolio',
        equity: netWorth,
        mortgage: mortSum,
        value: valSum
      });
    }

    return {
      totalValue: valSum,
      totalMortgage: mortSum,
      totalEquity: netWorth,
      totalRent: rentSum,
      totalCashFlow: cashFlowSum,
      chartData: chart,
      tableData: items
    };
  }, [rentals]);

  if (rentals.length === 0) return null;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── KPI Grid ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Net Worth Card (Highlighted) */}
        <div className="stat-card metric-glow flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-green uppercase tracking-wider">Portfolio Net Worth</p>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-1)' }}>{formatCurrency(totalEquity)}</p>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Total equity across all properties</p>
        </div>

        {/* Total Assets */}
        <div className="stat-card flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Property Value</p>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-1)' }}>{formatCurrency(totalValue)}</p>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Sum of current market values</p>
        </div>

        {/* Total Liabilities */}
        <div className="stat-card flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding Debt</p>
            <p className="text-2xl font-bold text-red-400 mt-2">{formatCurrency(totalMortgage)}</p>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Combined mortgage balances</p>
        </div>

        {/* Gross Rent */}
        <div className="stat-card flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Monthly Rent</p>
            <p className="text-2xl font-bold text-green-400 mt-2">{formatCurrency(totalRent)}</p>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Total monthly rental income</p>
        </div>

        {/* Estimated Cash Flow */}
        <div className="stat-card flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Monthly Cash Flow</p>
            <p className={`text-2xl font-bold mt-2 ${totalCashFlow >= 0 ? 'text-green' : 'text-red-400'}`}>
              {totalCashFlow >= 0 ? '+' : ''}{formatCurrency(totalCashFlow)}
            </p>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Rent - (Mortgage P&I/Escrow + PM Fees)</p>
        </div>
      </div>

      {/* ── Visual Breakdown Section ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Stacked Equity vs Debt Chart */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-1 mb-1">Equity vs Debt Stack</h3>
            <p className="text-[11px] text-gray-500 mb-6">Valuation structure showing ownership vs outstanding debt</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-2)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: 'var(--text-2)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={val => <span className="text-text-2 text-xs font-medium">{val}</span>}
                />
                {/* Stacked bars: Equity on bottom, Mortgage Debt on top */}
                <Bar dataKey="equity" name="Equity" stackId="valuation" fill="#00D28E" />
                <Bar dataKey="mortgage" name="Mortgage Debt" stackId="valuation" fill="#F87171" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Portfolio Assets & Liabilities Breakdown Table */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-1 mb-1">Portfolio Asset & Debt List</h3>
            <p className="text-[11px] text-gray-500 mb-6">Detailed view of asset value, mortgage balance, equity, and leverage</p>
          </div>
          <div className="overflow-x-auto border border-gray-700/50 rounded-xl flex-grow">
            <table className="min-w-full divide-y divide-gray-700/50 text-xs text-left">
              <thead className="bg-[#1E293B]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-text-2 uppercase">Property</th>
                  <th className="px-4 py-3 font-semibold text-text-2 uppercase text-right">Value</th>
                  <th className="px-4 py-3 font-semibold text-text-2 uppercase text-right">Mortgage</th>
                  <th className="px-4 py-3 font-semibold text-text-2 uppercase text-right">Net Worth (Equity)</th>
                  <th className="px-4 py-3 font-semibold text-text-2 uppercase text-center">LTV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-[#1E293B]/30">
                {tableData.map(item => (
                  <tr key={item.id} className="table-row">
                    <td className="px-4 py-3 font-medium text-text-1 truncate max-w-[150px]">{item.name}</td>
                    <td className="px-4 py-3 text-text-1 text-right">{formatCurrency(item.value)}</td>
                    <td className="px-4 py-3 text-red-400 text-right">{item.mortgage > 0 ? formatCurrency(item.mortgage) : '—'}</td>
                    <td className="px-4 py-3 text-green text-right font-semibold">{formatCurrency(item.equity)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.ltv > 80 ? 'bg-red-950 text-red-400 border border-red-900' :
                        item.ltv > 50 ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                        item.ltv > 0  ? 'bg-blue-950 text-blue-400 border border-blue-900' :
                        'bg-green-950 text-green-400 border border-green-900'
                      }`}>
                        {item.ltv > 0 ? `${item.ltv.toFixed(1)}%` : '0%'}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-[#1E293B]/70 font-bold border-t border-gray-700">
                  <td className="px-4 py-3 text-text-1">Total Portfolio</td>
                  <td className="px-4 py-3 text-text-1 text-right">{formatCurrency(totalValue)}</td>
                  <td className="px-4 py-3 text-red-400 text-right">{totalMortgage > 0 ? formatCurrency(totalMortgage) : '—'}</td>
                  <td className="px-4 py-3 text-green text-right">{formatCurrency(totalEquity)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-text-2">
                      {totalValue > 0 ? `${((totalMortgage / totalValue) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
