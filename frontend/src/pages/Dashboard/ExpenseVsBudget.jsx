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
      if (isMounted && resData) setData(resData);
      if (isMounted) setLoading(false);
    };
    fetchData();
    return () => { isMounted = false; };
  }, [month, get]);

  const DarkTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', fontSize: 12 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#F8FAFC' }}>{label}</p>
          <p style={{ margin: '2px 0', color: '#38BDF8' }}>Budgeted: {formatCurrency(payload[0]?.value)}</p>
          <p style={{ margin: '2px 0', color: '#FF6C00' }}>Actual: {formatCurrency(payload[1]?.value)}</p>
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #334155' }}>
            {payload[1]?.value > payload[0]?.value ? (
              <p style={{ margin: 0, color: '#EF4444', fontWeight: 700, fontSize: 11 }}>Over by {formatCurrency(payload[1].value - payload[0].value)}</p>
            ) : (
              <p style={{ margin: 0, color: '#00D28E', fontWeight: 700, fontSize: 11 }}>Under by {formatCurrency(payload[0].value - payload[1].value)}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>Expense vs Budget</h3>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="form-input"
          style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }}
        />
      </div>

      <div style={{ height: 260 }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13 }}>Loading…</div>
        ) : data.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13, textAlign: 'center' }}>
            No budget or expenses found for this month.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(51,65,85,0.5)" />
              <XAxis type="number" tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="category" type="category" width={90} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Bar dataKey="budgeted" name="Budgeted" fill="#38BDF8" radius={[0, 4, 4, 0]} />
              <Bar dataKey="actual"   name="Actual"   fill="#FF6C00" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
