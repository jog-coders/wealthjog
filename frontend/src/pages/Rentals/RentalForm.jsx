import { useState, useEffect } from 'react';

// All date fields in this form — empty string → null before submit
const DATE_FIELDS = [
  'purchase_date', 'closing_date',
  'mortgage_maturity_date',
  'lease_start_date', 'lease_end_date',
];

// Sanitize payload: empty date strings → null, empty numeric strings → 0
function sanitize(data) {
  const out = { ...data };
  DATE_FIELDS.forEach(f => {
    if (!out[f] || out[f].trim() === '') out[f] = null;
  });
  return out;
}

function validate(data) {
  const errors = {};
  if (!data.property_name?.trim()) errors.property_name = 'Property name is required.';

  // Dates: if provided, must be a valid date string
  DATE_FIELDS.forEach(f => {
    const v = data[f];
    if (v && v.trim() !== '' && isNaN(Date.parse(v))) {
      errors[f] = 'Enter a valid date (YYYY-MM-DD).';
    }
  });

  // Lease: if one date is set, both should be set
  if (data.lease_start_date && !data.lease_end_date) errors.lease_end_date = 'Lease end date is required if start date is set.';
  if (data.lease_end_date && !data.lease_start_date) errors.lease_start_date = 'Lease start date is required if end date is set.';
  if (data.lease_start_date && data.lease_end_date && data.lease_start_date >= data.lease_end_date) {
    errors.lease_end_date = 'Lease end date must be after start date.';
  }

  return errors;
}

// ── Reusable field components ─────────────────────────────────────────────────
function FieldWrap({ label, error, children, span2 = false }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ color: '#F87171', fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

const inputStyle = (hasError = false) => ({
  display: 'block', width: '100%', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  background: '#0F172A', color: '#F8FAFC',
  border: `1.5px solid ${hasError ? '#F87171' : '#334155'}`,
  outline: 'none', transition: 'border-color 0.15s',
  colorScheme: 'dark',
});

function TextInput({ name, value, onChange, errors, ...rest }) {
  return (
    <input name={name} value={value || ''} onChange={onChange}
      style={inputStyle(!!errors?.[name])} {...rest}
      onFocus={e => { e.target.style.borderColor = errors?.[name] ? '#F87171' : '#00D28E'; }}
      onBlur={e  => { e.target.style.borderColor = errors?.[name] ? '#F87171' : '#334155'; }}
    />
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#00D28E', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
        {title}
      </p>
      <div className="grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#1E293B', margin: '4px 0' }} />;
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function RentalForm({ property, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    property_name: '',
    address: { street: '', city: '', state: '', zip: '', country: '' },
    purchase_price: '', current_market_value: '',
    rent: '', property_management_fees: '',
    purchase_date: '', closing_date: '',
    status_occupied: true,
    pm_name: '', pm_poc: '', pm_email: '', pm_phone: '', pm_escalation: '',
    mortgage_initial_amount: '', mortgage_balance: '',
    mortgage_pi: '', mortgage_escrow: '',
    mortgage_interest_rate: '', mortgage_bank: '', mortgage_loan_number: '',
    mortgage_maturity_date: '',
    lease_tenant_name: '',
    lease_start_date: '', lease_end_date: '',
    lease_document_url: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (property) {
      setFormData(prev => ({
        ...prev,
        ...property,
        address: property.address || prev.address,
        // Normalize null dates to '' for controlled inputs
        ...Object.fromEntries(DATE_FIELDS.map(f => [f, property[f] || ''])),
      }));
    }
  }, [property]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Clear field error on change
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      const firstKey = Object.keys(errs)[0];
      document.getElementById(`rf-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return; // ← STOP — do NOT close or submit
    }
    onSubmit(sanitize(formData));
  };

  const modal = { background: '#1E293B', border: '1px solid #334155' };
  const header = { background: '#0B1120', borderBottom: '1px solid #1E293B' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 200 }}>
      <div style={{ ...modal, borderRadius: 18, width: '100%', maxWidth: 860, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ ...header, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, borderRadius: '18px 18px 0 0' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
            {property ? 'Edit Property' : 'Add Property'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 22, lineHeight: 1 }} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }} noValidate>

          {/* Validation summary */}
          {Object.keys(errors).length > 0 && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#F87171' }}>Please fix the following before saving:</p>
              <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 12, color: '#F87171' }}>
                {Object.values(errors).map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            </div>
          )}

          {/* ── General ── */}
          <Section title="General Details">
            <FieldWrap label="Property Name *" error={errors.property_name} span2>
              <TextInput id="rf-property_name" name="property_name" value={formData.property_name} onChange={handleChange} errors={errors} placeholder="e.g. Oak Street Duplex" />
            </FieldWrap>
            <FieldWrap label="Street" span2>
              <TextInput name="address.street" value={formData.address.street} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="City">
              <TextInput name="address.city" value={formData.address.city} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="State">
              <TextInput name="address.state" value={formData.address.state} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Zip Code">
              <TextInput name="address.zip" value={formData.address.zip} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Status">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 2 }}>
                <input type="checkbox" name="status_occupied" checked={formData.status_occupied} onChange={handleChange}
                  style={{ accentColor: '#00D28E', width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: '#94A3B8' }}>Occupied</span>
              </label>
            </FieldWrap>
          </Section>

          <Divider />

          {/* ── Acquisition ── */}
          <Section title="Acquisition & Valuation">
            {property && (
              <div className="sm:col-span-2" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#38BDF8' }}>
                <strong>Note:</strong> Market Value, Rent, and PM Fees are updated via the <strong>Financial History</strong> tab.
              </div>
            )}
            <FieldWrap label="Purchase Price">
              <TextInput type="number" step="0.01" min="0" name="purchase_price" value={formData.purchase_price} onChange={handleChange} errors={errors} placeholder="0.00" />
            </FieldWrap>
            <FieldWrap label="Current Market Value">
              <TextInput type="number" step="0.01" min="0" name="current_market_value" value={formData.current_market_value} onChange={handleChange} errors={errors} placeholder="0.00"
                disabled={!!property} style={{ ...inputStyle(), opacity: property ? 0.5 : 1 }} />
            </FieldWrap>
            <FieldWrap label="Purchase Date" error={errors.purchase_date}>
              <TextInput id="rf-purchase_date" type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Closing Date" error={errors.closing_date}>
              <TextInput id="rf-closing_date" type="date" name="closing_date" value={formData.closing_date} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Monthly Rent">
              <TextInput type="number" step="0.01" min="0" name="rent" value={formData.rent} onChange={handleChange} errors={errors} placeholder="0.00"
                disabled={!!property} />
            </FieldWrap>
            <FieldWrap label="PM Fees (Monthly)">
              <TextInput type="number" step="0.01" min="0" name="property_management_fees" value={formData.property_management_fees} onChange={handleChange} errors={errors} placeholder="0.00"
                disabled={!!property} />
            </FieldWrap>
          </Section>

          <Divider />

          {/* ── Mortgage ── */}
          <Section title="Mortgage Details">
            <FieldWrap label="Original Loan Amount">
              <TextInput type="number" step="0.01" min="0" name="mortgage_initial_amount" value={formData.mortgage_initial_amount} onChange={handleChange} errors={errors} placeholder="0.00" />
            </FieldWrap>
            <FieldWrap label="Current Balance">
              <TextInput type="number" step="0.01" min="0" name="mortgage_balance" value={formData.mortgage_balance} onChange={handleChange} errors={errors} placeholder="0.00" />
            </FieldWrap>
            <FieldWrap label="Interest Rate (%)">
              <TextInput type="number" step="0.01" min="0" max="100" name="mortgage_interest_rate" value={formData.mortgage_interest_rate} onChange={handleChange} errors={errors} placeholder="e.g. 6.75" />
            </FieldWrap>
            <FieldWrap label="P&I (Monthly)">
              <TextInput type="number" step="0.01" min="0" name="mortgage_pi" value={formData.mortgage_pi} onChange={handleChange} errors={errors} placeholder="0.00" />
            </FieldWrap>
            <FieldWrap label="Escrow (Monthly)">
              <TextInput type="number" step="0.01" min="0" name="mortgage_escrow" value={formData.mortgage_escrow} onChange={handleChange} errors={errors} placeholder="0.00" />
            </FieldWrap>
            <FieldWrap label="Maturity Date" error={errors.mortgage_maturity_date}>
              <TextInput id="rf-mortgage_maturity_date" type="date" name="mortgage_maturity_date" value={formData.mortgage_maturity_date} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Bank / Institution">
              <TextInput name="mortgage_bank" value={formData.mortgage_bank} onChange={handleChange} errors={errors} placeholder="e.g. Chase" />
            </FieldWrap>
            <FieldWrap label="Loan Number">
              <TextInput name="mortgage_loan_number" value={formData.mortgage_loan_number} onChange={handleChange} errors={errors} />
            </FieldWrap>
          </Section>

          <Divider />

          {/* ── Lease ── */}
          <Section title="Lease Agreement">
            <FieldWrap label="Tenant Name" span2>
              <TextInput name="lease_tenant_name" value={formData.lease_tenant_name} onChange={handleChange} errors={errors} placeholder="Full name" />
            </FieldWrap>
            <FieldWrap label="Lease Start Date" error={errors.lease_start_date}>
              <TextInput id="rf-lease_start_date" type="date" name="lease_start_date" value={formData.lease_start_date} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Lease End Date" error={errors.lease_end_date}>
              <TextInput id="rf-lease_end_date" type="date" name="lease_end_date" value={formData.lease_end_date} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Lease Document URL" span2>
              <TextInput type="url" name="lease_document_url" value={formData.lease_document_url} onChange={handleChange} errors={errors} placeholder="https://..." />
            </FieldWrap>
          </Section>

          <Divider />

          {/* ── Property Management ── */}
          <Section title="Property Management">
            <FieldWrap label="Company Name" span2>
              <TextInput name="pm_name" value={formData.pm_name} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Point of Contact">
              <TextInput name="pm_poc" value={formData.pm_poc} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Email">
              <TextInput type="email" name="pm_email" value={formData.pm_email} onChange={handleChange} errors={errors} />
            </FieldWrap>
            <FieldWrap label="Phone">
              <TextInput type="tel" name="pm_phone" value={formData.pm_phone} onChange={handleChange} errors={errors} />
            </FieldWrap>
          </Section>

          {/* ── Footer ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid #1E293B', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ minWidth: 96 }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ minWidth: 128 }}>Save Property</button>
          </div>
        </form>
      </div>
    </div>
  );
}
