import { useState, useEffect } from 'react';

export default function CurrencyInput({ value, onChange, placeholder = '0.00' }) {
  const [displayValue, setDisplayValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplayValue(Number(value).toFixed(2));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleBlur = () => {
    let num = Number(displayValue);
    if (isNaN(num)) num = 0;
    
    if (num < 0) {
      setError('Amount cannot be negative');
      num = 0;
    } else {
      setError('');
    }
    
    const formatted = num.toFixed(2);
    setDisplayValue(formatted);
    onChange(Number(formatted));
  };

  const handleChange = (e) => {
    setDisplayValue(e.target.value);
  };

  return (
    <div>
      <div className="relative rounded-lg">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 sm:text-sm">$</span>
        </div>
        <input
          type="number"
          step="0.01"
          min="0"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`block w-full rounded-lg pl-7 pr-3 py-1.5 text-gray-900 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
            error ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-200 focus:ring-primary-500'
          }`}
          placeholder={placeholder}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
