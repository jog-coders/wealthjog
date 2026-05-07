import { useState, useEffect } from 'react';

export default function RentalForm({ property, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    property_name: '',
    address: { street: '', city: '', state: '', zip: '', country: '' },
    purchase_price: 0,
    current_market_value: 0,
    rent: 0,
    property_management_fees: 0,
    purchase_date: '',
    closing_date: '',
    status_occupied: true,
    
    pm_name: '',
    pm_poc: '',
    pm_email: '',
    pm_phone: '',
    pm_escalation: '',
    
    mortgage_initial_amount: 0,
    mortgage_balance: 0,
    mortgage_pi: 0,
    mortgage_escrow: 0,
    mortgage_interest_rate: 0,
    mortgage_bank: '',
    mortgage_loan_number: '',
    mortgage_maturity_date: '',
    
    lease_tenant_name: '',
    lease_start_date: '',
    lease_end_date: '',
    lease_document_url: ''
  });

  useEffect(() => {
    if (property) {
      setFormData(prev => ({
        ...prev,
        ...property,
        address: property.address || prev.address
      }));
    }
  }, [property]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">{property ? 'Edit Property Details' : 'Add Property'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* General Details */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">General Details</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Property Name</label>
                <input required type="text" name="property_name" value={formData.property_name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Street</label>
                <input type="text" name="address.street" value={formData.address.street} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">State</label>
                <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Zipcode</label>
                <input type="text" name="address.zip" value={formData.address.zip} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-2 flex items-center">
                  <input type="checkbox" name="status_occupied" checked={formData.status_occupied} onChange={handleChange} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">Occupied</span>
                </div>
              </div>
            </div>
          </div>

          <hr />

          {/* Initial Financials */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Initial Acquisition & Valuation</h3>
            {property && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 text-sm text-blue-800">
                <strong>Note:</strong> Current Market Value, Rent, and PM Fees are managed via the <strong>Financial History</strong> tab. You can add a new snapshot there to update these values.
              </div>
            )}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
                <input type="number" step="0.01" name="purchase_price" value={formData.purchase_price} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Market Value</label>
                <input disabled={!!property} type="number" step="0.01" name="current_market_value" value={formData.current_market_value || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Closing Date</label>
                <input type="date" name="closing_date" value={formData.closing_date} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Monthly Rent</label>
                <input disabled={!!property} type="number" step="0.01" name="rent" value={formData.rent || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Property Mgmt Fees (Monthly)</label>
                <input disabled={!!property} type="number" step="0.01" name="property_management_fees" value={formData.property_management_fees || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" />
              </div>
            </div>
          </div>

          <hr />

          {/* Mortgage */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Mortgage Details</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Original Loan Balance</label>
                <input type="number" step="0.01" name="mortgage_initial_amount" value={formData.mortgage_initial_amount} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Mortgage Balance</label>
                <input type="number" step="0.01" name="mortgage_balance" value={formData.mortgage_balance} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Interest Rate (%)</label>
                <input type="number" step="0.01" name="mortgage_interest_rate" value={formData.mortgage_interest_rate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">P&I (Monthly)</label>
                <input type="number" step="0.01" name="mortgage_pi" value={formData.mortgage_pi} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Escrow (Monthly)</label>
                <input type="number" step="0.01" name="mortgage_escrow" value={formData.mortgage_escrow} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maturity Date</label>
                <input type="date" name="mortgage_maturity_date" value={formData.mortgage_maturity_date} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bank / Institution</label>
                <input type="text" name="mortgage_bank" value={formData.mortgage_bank} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Loan Number</label>
                <input type="text" name="mortgage_loan_number" value={formData.mortgage_loan_number} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
            </div>
          </div>

          <hr />

          {/* Lease Details */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Lease Agreement</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Tenant Name</label>
                <input type="text" name="lease_tenant_name" value={formData.lease_tenant_name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Lease Start Date</label>
                <input type="date" name="lease_start_date" value={formData.lease_start_date} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Lease End Date</label>
                <input type="date" name="lease_end_date" value={formData.lease_end_date} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Lease Document URL</label>
                <input type="url" name="lease_document_url" value={formData.lease_document_url} onChange={handleChange} placeholder="https://..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
            </div>
          </div>

          <hr />

          {/* PM Company */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Property Management</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input type="text" name="pm_name" value={formData.pm_name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">POC Name</label>
                <input type="text" name="pm_poc" value={formData.pm_poc} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">POC Email</label>
                <input type="email" name="pm_email" value={formData.pm_email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">POC Phone</label>
                <input type="text" name="pm_phone" value={formData.pm_phone} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
            </div>
          </div>

          <div className="pt-5 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-200 mt-8 -mx-6 -mb-6 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none">Cancel</button>
            <button type="submit" className="btn-primary">Save Property</button>
          </div>
        </form>
      </div>
    </div>
  );
}
