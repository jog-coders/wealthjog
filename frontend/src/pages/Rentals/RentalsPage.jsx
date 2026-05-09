import { useState, useRef, useEffect } from 'react';
import { useRentals } from '../../hooks/useRentals';
import RentalForm from './RentalForm';
import RentalDashboard from './RentalDashboard';
import { PlusIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatCurrency';
import ConfirmDialog from '../../components/ConfirmDialog';
import toast from 'react-hot-toast';

// ── 3-dot action menu ────────────────────────────────────────────────────────
function CardMenu({ property, onDeactivate, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = property.is_active !== false;

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Property actions"
        style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}
        className="hover:bg-gray-100"
      >
        ···
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 170, overflow: 'hidden',
        }}>
          <button
            onClick={() => { setOpen(false); onDeactivate(isActive); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: isActive ? '#d97706' : '#059669', textAlign: 'left' }}
            className="hover:bg-gray-50"
          >
            {isActive ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                Mark as Inactive
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                Mark as Active
              </>
            )}
          </button>
          <div style={{ borderTop: '1px solid #f3f4f6' }} />
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#dc2626', textAlign: 'left' }}
            className="hover:bg-red-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Delete Property
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RentalsPage() {
  const { rentals, loading, createRental, updateRental, deleteRental, toggleStatus } = useRentals();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // property to delete

  if (loading) return <div className="p-8 text-center text-gray-500">Loading rentals...</div>;

  if (selectedProperty) {
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

  const handleDeactivate = async (prop, newActive) => {
    const label = newActive ? 'Activated' : 'Marked as inactive';
    const { error } = await toggleStatus(prop.id, newActive);
    if (!error) toast.success(`${prop.property_name}: ${label}`);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await deleteRental(confirmDelete.id);
    if (!error) toast.success(`${confirmDelete.property_name} deleted`);
    setConfirmDelete(null);
  };

  const visibleRentals = showInactive
    ? rentals
    : rentals.filter(r => r.is_active !== false);

  const inactiveCount = rentals.filter(r => r.is_active === false).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <h1 className="page-title mb-0">Rental Properties</h1>
          {inactiveCount > 0 && (
            <button
              onClick={() => setShowInactive(s => !s)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                showInactive
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-500'
              }`}
            >
              {showInactive ? `Hide inactive (${inactiveCount})` : `Show inactive (${inactiveCount})`}
            </button>
          )}
        </div>
        <button onClick={() => setIsFormOpen(true)} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" /> Add Property
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleRentals.map(prop => {
          const isActive = prop.is_active !== false;
          return (
            <div
              key={prop.id}
              onClick={() => isActive && setSelectedProperty(prop)}
              className={`bg-white border rounded-xl p-6 transition relative ${
                isActive
                  ? 'border-gray-100 cursor-pointer hover:shadow-md'
                  : 'border-gray-200 opacity-60 cursor-default'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{prop.property_name}</h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isActive && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>
                  )}
                  {isActive && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${prop.status_occupied ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {prop.status_occupied ? 'Occupied' : 'Vacant'}
                    </span>
                  )}
                  <CardMenu
                    property={prop}
                    onDeactivate={(setActive) => handleDeactivate(prop, setActive)}
                    onDelete={() => setConfirmDelete(prop)}
                  />
                </div>
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
          );
        })}
      </div>

      {visibleRentals.length === 0 && rentals.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-xl">
          <h3 className="text-lg font-medium text-gray-900">No properties yet</h3>
          <p className="text-gray-500 mt-1 mb-4">Start building your real estate portfolio.</p>
          <button onClick={() => setIsFormOpen(true)} className="btn-primary inline-flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" /> Add Your First Property
          </button>
        </div>
      )}

      {visibleRentals.length === 0 && rentals.length > 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          All properties are inactive. <button onClick={() => setShowInactive(true)} className="text-primary-500 underline">Show inactive</button>
        </div>
      )}

      {isFormOpen && (
        <RentalForm
          property={null}
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (data) => {
            await createRental(data);
            setIsFormOpen(false);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Property"
        message={`Permanently delete "${confirmDelete?.property_name}"? This will also remove its linked asset, liability, and income entries. This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}


