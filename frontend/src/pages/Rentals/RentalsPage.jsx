import { useState } from 'react';
import { useRentals } from '../../hooks/useRentals';
import RentalForm from './RentalForm';
import RentalDashboard from './RentalDashboard';
import { PlusIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatCurrency';

export default function RentalsPage() {
  const { rentals, loading, createRental, updateRental } = useRentals();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading rentals...</div>;

  if (selectedProperty) {
    // Re-find to ensure we have latest data after edits
    const prop = rentals.find(r => r.id === selectedProperty.id) || selectedProperty;
    return (
      <>
        <RentalDashboard 
          property={prop} 
          onBack={() => setSelectedProperty(null)}
          onEdit={() => setIsFormOpen(true)}
        />
        {isFormOpen && (
          <RentalForm 
            property={prop}
            onClose={() => setIsFormOpen(false)}
            onSubmit={async (data) => {
              await updateRental(prop.id, data);
              setIsFormOpen(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">Rental Properties</h1>
        <button onClick={() => setIsFormOpen(true)} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" /> Add Property
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rentals.map(prop => (
          <div key={prop.id} onClick={() => setSelectedProperty(prop)} className="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{prop.property_name}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${prop.status_occupied ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {prop.status_occupied ? 'Occupied' : 'Vacant'}
              </span>
            </div>
            
            <p className="text-xs text-gray-500 mb-6 truncate">
              {prop.address?.street ? `${prop.address.street}, ${prop.address.city}` : 'No address provided'}
            </p>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Market Value</span>
                <span className="font-semibold text-gray-900">{formatCurrency(prop.current_market_value)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mortgage Balance</span>
                <span className="font-semibold text-red-600">{formatCurrency(prop.mortgage_balance)}</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Monthly Rent</span>
                <span className="font-bold text-green-600">{formatCurrency(prop.rent)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rentals.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-xl">
          <h3 className="text-lg font-medium text-gray-900">No properties yet</h3>
          <p className="text-gray-500 mt-1 mb-4">Start building your real estate portfolio.</p>
          <button onClick={() => setIsFormOpen(true)} className="btn-primary inline-flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" /> Add Your First Property
          </button>
        </div>
      )}

      {isFormOpen && (
        <RentalForm 
          property={selectedProperty}
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (data) => {
            if (selectedProperty) {
              await updateRental(selectedProperty.id, data);
            } else {
              await createRental(data);
            }
            setIsFormOpen(false);
          }}
        />
      )}
    </div>
  );
}
