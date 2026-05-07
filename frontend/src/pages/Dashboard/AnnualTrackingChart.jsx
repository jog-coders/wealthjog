import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

export default function AnnualTrackingChart() {
  const { get } = useApi();
  
  const currentYearStr = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYearStr);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const { data: resData } = await get(`/api/dashboard/annual-budget-vs-actual?year=${year}`);
      if (isMounted && resData) {
        setData(resData);
      }
      if (isMounted) setLoading(false);
    };
    fetchData();
    return () => { isMounted = false; };
  }, [year, get]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded text-sm">
          <p className="font-semibold mb-1">{label}</p>
          <p style={{ color: payload[0].color }}>Annual Budget: {formatCurrency(payload[0].value)}</p>
          <p style={{ color: payload[1].color }}>YTD Actual: {formatCurrency(payload[1].value)}</p>
        </div>
      );
    }
    return null;
  };

  const years = [];
  const currentY = new Date().getFullYear();
  for (let i = currentY - 5; i <= currentY + 1; i++) {
    years.push(i.toString());
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Annual Budget Tracking</h3>
        <select 
          value={year} 
          onChange={e => setYear(e.target.value)} 
          className="rounded-lg border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-200 sm:text-sm px-3 bg-white"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      
      <div className="flex-grow h-80 min-h-[20rem] w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center">
            No annual budget set for this year.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{fontSize: 12}} angle={-45} textAnchor="end" />
              <YAxis tickFormatter={(val) => `$${val/1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="budgeted" name="Annual Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ytdActual" name="YTD Actual" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
