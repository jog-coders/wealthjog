import { useState } from 'react';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import RentalLedger from './RentalLedger';
import RentalHistoryLedger from './RentalHistoryLedger';
import { formatCurrency } from '../../utils/formatCurrency';

export default function RentalDashboard({ property, onBack, onEdit }) {
  const [activeTab, setActiveTab] = useState('transactions');

  const mortAmt = (Number(property.mortgage_pi) || 0) + (Number(property.mortgage_escrow) || 0);
  const pmFees = Number(property.property_management_fees) || 0;
  const rent = Number(property.rent) || 0;
  const pl = rent - (pmFees + mortAmt);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{property.property_name}</h1>
            <p className="text-sm text-gray-500">
              {property.address?.street}, {property.address?.city} {property.address?.state} {property.address?.zip}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${property.status_occupied ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {property.status_occupied ? 'Occupied' : 'Vacant'}
          </span>
          <button onClick={onEdit} className="btn-secondary flex items-center">
            <PencilIcon className="h-4 w-4 mr-2" /> Edit Details
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-medium text-gray-500">Monthly Cash Flow</p>
          <p className={`text-2xl font-bold mt-2 ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Rent - (Mortgage + PM Fees)</p>
        </div>
        
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-medium text-gray-500">Current Market Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(property.current_market_value)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {property.closing_date ? `Closed on ${property.closing_date}` : `Purchased for ${formatCurrency(property.purchase_price)}`}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-medium text-gray-500">Mortgage Balance</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(property.mortgage_balance)}</p>
          <p className="text-xs text-gray-400 mt-1">{property.mortgage_interest_rate}% Interest</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-medium text-gray-500">Gross Monthly Rent</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(property.rent)}</p>
          <p className="text-xs text-gray-400 mt-1">PM Fees: {formatCurrency(pmFees)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Ledgers */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white border-b border-gray-200 px-4 pt-2 rounded-t-xl">
            <nav className="-mb-px flex space-x-8">
              <button 
                onClick={() => setActiveTab('transactions')} 
                className={`${activeTab === 'transactions' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Transactions Ledger
              </button>
              <button 
                onClick={() => setActiveTab('history')} 
                className={`${activeTab === 'history' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Financial History
              </button>
            </nav>
          </div>
          
          <div className="p-0">
            {activeTab === 'transactions' ? <RentalLedger propertyId={property.id} /> : <RentalHistoryLedger propertyId={property.id} />}
          </div>
        </div>
        
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Lease Agreement</h3>
            {property.lease_tenant_name ? (
              <div className="space-y-3 text-sm">
                <p><span className="text-gray-500">Tenant:</span> {property.lease_tenant_name}</p>
                <p><span className="text-gray-500">Start Date:</span> {property.lease_start_date || 'N/A'}</p>
                <p><span className="text-gray-500">End Date:</span> {property.lease_end_date || 'N/A'}</p>
                {property.lease_document_url && (
                  <p>
                    <span className="text-gray-500">Document:</span>{' '}
                    <a href={property.lease_document_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">View Lease</a>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active lease recorded.</p>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Property Management</h3>
            {property.pm_name ? (
              <div className="space-y-3 text-sm">
                <p><span className="text-gray-500">Company:</span> {property.pm_name}</p>
                <p><span className="text-gray-500">Contact:</span> {property.pm_poc}</p>
                <p><span className="text-gray-500">Email:</span> {property.pm_email || 'N/A'}</p>
                <p><span className="text-gray-500">Phone:</span> {property.pm_phone || 'N/A'}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Self-managed</p>
            )}
          </div>
          
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mortgage Details</h3>
            {property.mortgage_balance > 0 ? (
              <div className="space-y-3 text-sm">
                <p><span className="text-gray-500">Bank:</span> {property.mortgage_bank || 'N/A'}</p>
                <p><span className="text-gray-500">Loan #:</span> {property.mortgage_loan_number || 'N/A'}</p>
                <p><span className="text-gray-500">P&I:</span> {formatCurrency(property.mortgage_pi)}/mo</p>
                <p><span className="text-gray-500">Escrow:</span> {formatCurrency(property.mortgage_escrow)}/mo</p>
                <p><span className="text-gray-500">Initial Loan:</span> {formatCurrency(property.mortgage_initial_amount)}</p>
                <p><span className="text-gray-500">Maturity Date:</span> {property.mortgage_maturity_date || 'N/A'}</p>
              </div>
            ) : (
              <p className="text-sm text-green-600 font-medium">Fully Paid Off 🎯</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
