import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudget } from '../../hooks/useBudget';
import EmptyState from '../../components/EmptyState';
import ExpenseForm from './ExpenseForm';
import BulkExpenseForm from './BulkExpenseForm';
import ExpenseTable from './ExpenseTable';
import OverspendAlerts from './OverspendAlerts';

export default function ExpenseTrackerPage() {
  const navigate = useNavigate();
  const { lineItems, loading } = useBudget();
  const [activeTab, setActiveTab] = useState('single');

  if (loading) return null;

  const hasBudgetCategories = 
    (lineItems.annual && lineItems.annual.length > 0) || 
    (lineItems.guilt_free && lineItems.guilt_free.length > 0);

  if (!hasBudgetCategories) {
    return (
      <EmptyState 
        title="No budget set up yet"
        message="Set up your budget first to track expenses."
        actionLabel="Go to Budget"
        onAction={() => navigate('/budget')}
      />
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="page-title">Expense Tracker</h2>

      <OverspendAlerts />

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('single')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 text-sm font-medium ${
                activeTab === 'single'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Single Expense
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 text-sm font-medium ${
                activeTab === 'bulk'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Bulk Entry / Upload CSV
            </button>
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'single' ? <ExpenseForm /> : <BulkExpenseForm onSuccess={() => setActiveTab('single')} />}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h3 className="section-title mb-4">Expense History</h3>
        <ExpenseTable />
      </div>
    </div>
  );
}
