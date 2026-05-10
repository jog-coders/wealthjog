import { useState, useEffect } from 'react';

export default function CurrencyInput({ value, onChange, placeholder = '0.00' }) {
  const [displayValue, setDisplayValue] = useState('');

  // Sync display when external value changes
  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      setDisplayValue(Number(value).toFixed(2));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  // Call onChange on every keystroke so parent state is always current.
  // This fixes the race condition where clicking Save immediately after
  // typing would see the old amount value (blur fires, but React hadn't
  // re-rendered before the click handler ran).
  const handleChange = (e) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    } else if (raw === '' || raw === '-') {
      // Don't call onChange for incomplete input
    }
  };

  // On blur: format display and ensure parent has the final value
  const handleBlur = () => {
    let num = parseFloat(displayValue);
    if (isNaN(num) || num < 0) num = 0;
    const formatted = num.toFixed(2);
    setDisplayValue(formatted);
    onChange(num); // Guarantee parent has the final parsed value
  };

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#9CA3AF', fontSize: 13, pointerEvents: 'none',
        }}>$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="form-input"
          style={{ paddingLeft: 26 }}
        />
      </div>
    </div>
  );
}
