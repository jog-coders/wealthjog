import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

export default function ExpenseVsBudget() {
  const { get } = useApi();
  
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [month, setMonth] = useState(currentMonthStr);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const { data: resData } = await get(`/api/dashboard/expense-vs-budget?month=${month}`);
      if (isMounted && resData) {
        setData(resData);
      }
      if (isMounted) setLoading(false);
    };
    fetchData();
    return () => { isMounted = false; };
  }, [month, get]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded text-sm">
          <p className="font-semibold mb-1">{label}</p>
          <p style={{ color: payload[0].color }}>Budgeted: {formatCurrency(payload[0].value)}</p>
          <p style={{ color: payload[1].color }}>Actual: {formatCurrency(payload[1].value)}</p>
          <div className="mt-2 pt-2 border-t border-gray-100">
            {payload[1].value > payload[0].value ? (
              <p className="text-red-600 text-xs font-bold">Over budget by {formatCurrency(payload[1].value - payload[0].value)}</p>
            ) : (
              <p className="text-green-600 text-xs font-bold">Under budget by {formatCurrency(payload[0].value - payload[1].value)}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Expense vs Budget</h3>
        <input 
          type="month" 
          value={month} 
          onChange={e => setMonth(e.target.value)} 
          className="rounded-lg border-0 py-1 text-gray-900 ring-1 ring-inset ring-gray-200 sm:text-sm px-2"
        />
      </div>
      
      <div className="flex-grow h-64 min-h-[16rem]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center">
            No budget or expenses found for this month.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(val) => `$${val}`} />
              <YAxis dataKey="category" type="category" width={100} tick={{fontSize: 12}} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="budgeted" name="Budgeted" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="actual" name="Actual" fill="#f87171" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
