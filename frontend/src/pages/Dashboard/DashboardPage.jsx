import { useDashboard } from '../../hooks/useDashboard';
import NetWorthSnapshot from './NetWorthSnapshot';
import NetWorthHistory from './NetWorthHistory';
import ExpenseVsBudget from './ExpenseVsBudget';
import MonthlySpendChart from './MonthlySpendChart';
import AnnualTrackingChart from './AnnualTrackingChart';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function DashboardPage() {
  const { loading, periodMonths, setPeriodMonths } = useDashboard();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="page-title">Dashboard</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Period</span>
          <select
            value={periodMonths}
            onChange={(e) => setPeriodMonths(e.target.value)}
            className="rounded-lg border border-gray-200 py-1.5 pl-3 pr-8 text-sm text-gray-700 bg-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="3">Last 3 Months</option>
            <option value="6">Last 6 Months</option>
            <option value="12">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1">
          <NetWorthSnapshot />
        </div>
        <div className="md:col-span-1">
          <NetWorthHistory />
        </div>
        <div className="md:col-span-1">
          <ExpenseVsBudget />
        </div>
        <div className="md:col-span-1">
          <MonthlySpendChart />
        </div>
        <div className="md:col-span-2">
          <AnnualTrackingChart />
        </div>
      </div>
    </div>
  );
}
