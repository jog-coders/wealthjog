import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export default function EnumManager({ domain, label }) {
  const { get, post, del } = useApi();
  const [values, setValues] = useState([]);
  const [newValue, setNewValue] = useState('');

  const fetchValues = async () => {
    const { data } = await get(`/api/settings/enum-values?domain=${domain}`);
    if (data) setValues(data);
  };

  useEffect(() => {
    fetchValues();
  }, [domain]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    const { error } = await post('/api/settings/enum-values', { domain, label: newValue.trim() });
    if (!error) {
      setNewValue('');
      fetchValues();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await del(`/api/settings/enum-values/${id}`);
    if (!error) fetchValues();
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl mb-6">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">{label} Types</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map(val => (
            <span key={val.id} className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              {val.label}
              <button
                type="button"
                onClick={() => handleDelete(val.id)}
                className="ml-2 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-blue-400 hover:bg-blue-200 hover:text-primary-500 focus:bg-blue-500 focus:text-white focus:outline-none"
              >
                <span className="sr-only">Remove</span>
                <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                  <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={`New ${label} type`}
            className="block w-full max-w-xs rounded-lg border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
