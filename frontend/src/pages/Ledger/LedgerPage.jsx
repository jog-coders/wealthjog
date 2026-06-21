import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudget } from '../../hooks/useBudget';
import { useApi } from '../../hooks/useApi';
import { useAppContext } from '../../context/AppContext';
import TransactionTable from './TransactionTable';
import TransactionForm from './TransactionForm';
import CsvImportModal from './CsvImportModal';
import LedgerVisuals from './LedgerVisuals';
import { fmt, floatToCents } from '../../utils/formatCents';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthOptions() {
  const opts = [{ val: '', label: 'All transactions' }];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    opts.push({ val, label });
  }
  return opts;
}

const MONTHS = monthOptions();

// ── By-Budget tab ─────────────────────────────────────────────────────────────

function BudgetView({ transactions, lineItems, month, onDrillDown }) {
  // Build a map of category_id → spent cents (from categorized transactions)
  const spentMap = useMemo(() => {
    const map = {};
    transactions
      .filter(t => t.status === 'categorized' && t.category_id)
      .forEach(t => { map[t.category_id] = (map[t.category_id] || 0) + t.amount_cents; });
    return map;
  }, [transactions]);

  const monthLabel = month ? (MONTHS.find(m => m.val === month)?.label || month) : 'All time';

  const renderSection = (items, title) => {
    if (!items?.length) return null;
    const rows = items.map(item => {
      const budgeted = item.monthly_amount_cents || 0;
      const spent    = spentMap[item.id] || 0;
      const pct      = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
      const over     = spent > budgeted && budgeted > 0;
      const remaining = budgeted - spent;
      return { ...item, spent, budgeted, pct, over, remaining };
    }).sort((a, b) => b.spent - a.spent);

    const sectionSpent    = rows.reduce((s, r) => s + r.spent, 0);
    const sectionBudgeted = rows.reduce((s, r) => s + r.budgeted, 0);

    return (
      <div style={{ marginBottom: 32 }}>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {title}
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {fmt(sectionSpent)} <span style={{ color: 'var(--border)' }}>/ {fmt(sectionBudgeted)}</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(row => (
            <div
              key={row.id}
              onClick={() => onDrillDown(row.id, row.name || row.category)}
              style={{ background: 'var(--bg-card)', border: `1px solid ${row.over ? 'rgba(244,63,94,.35)' : 'var(--bg-elevated)'}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', transition: 'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = row.over ? 'rgba(244,63,94,.6)' : 'var(--border)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = row.over ? 'rgba(244,63,94,.35)' : 'var(--bg-elevated)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{row.name || row.category}</span>
                  {row.over && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(244,63,94,.12)', color: '#F43F5E', border: '1px solid rgba(244,63,94,.25)', borderRadius: 999, padding: '1px 7px' }}>
                      OVER by {fmt(row.spent - row.budgeted)}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <span style={{ color: row.over ? '#F43F5E' : '#10B981', fontWeight: 700 }}>{fmt(row.spent)}</span>
                  {row.budgeted > 0 && (
                    <span style={{ color: 'var(--text-3)' }}> / {fmt(row.budgeted)}</span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {row.budgeted > 0 && (
                <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${row.pct}%`,
                    borderRadius: 999,
                    background: row.over ? '#F43F5E' : row.pct > 85 ? '#EAB308' : '#10B981',
                    transition: 'width .4s ease',
                  }} />
                </div>
              )}

              {row.budgeted > 0 && !row.over && (
                <div style={{ marginTop: 5, fontSize: 11, color: 'var(--text-3)' }}>
                  {fmt(row.remaining)} remaining
                </div>
              )}
              {row.budgeted === 0 && row.spent > 0 && (
                <div style={{ marginTop: 5, fontSize: 11, color: 'var(--text-3)' }}>No budget set</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const allItems = [...(lineItems.annual || []), ...(lineItems.guilt_free || [])];
  const totalSpent    = allItems.reduce((s, item) => s + (spentMap[item.id] || 0), 0);
  const totalBudgeted = allItems.reduce((s, item) => s + (item.monthly_amount_cents || 0), 0);
  const totalOver     = totalSpent > totalBudgeted;

  if (!allItems.length) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
        <p style={{ fontSize: 15 }}>No budget categories set up yet.</p>
        <p style={{ fontSize: 13, marginTop: 4 }}>Go to the Budget page to create your spending plan.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Month summary strip */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Spent', value: fmt(totalSpent), color: totalOver ? '#F43F5E' : '#F4F4F5' },
          { label: 'Budgeted', value: fmt(totalBudgeted), color: 'var(--text-2)' },
          { label: 'Remaining', value: fmt(totalBudgeted - totalSpent), color: totalOver ? '#F43F5E' : '#10B981' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 20px', flex: '1 1 140px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{s.label} · {monthLabel}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {renderSection(lineItems.guilt_free, 'Monthly Spending')}
      {renderSection(lineItems.annual, 'Annual / Irregular')}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const [tab, setTab]               = useState('transactions');
  const [month, setMonth]           = useState(''); // '' = All transactions
  const [statusFilter, setStatus]   = useState('');
  const [categoryFilter, setCategory] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [showCsv, setShowCsv]       = useState(false);
  const [categories, setCategories] = useState([]);
  const [properties, setProperties] = useState([]);

  const { get } = useApi();
  const { session } = useAppContext();
  const { lineItems } = useBudget();

  // Load categories and properties for dropdowns
  useEffect(() => {
    if (!session) return;
    Promise.all([
      get('/api/budget/summary'),
      get('/api/rentals'),
    ]).then(([{ data: bData }, { data: rData }]) => {
      if (bData?.lineItems) {
        setCategories(bData.lineItems.map(li => ({
          id: li.id,
          name: li.name || li.category,
          category_type: li.section === 'annual' ? 'sinking_fund' : 'envelope',
        })));
      }
      if (rData) setProperties(rData.filter(p => p.is_active !== false));
    });
  }, [session]);

  // Load all transactions for selected month; apply filters client-side in the table
  const { transactions: allTx, uncategorizedCount, loading, importing,
          addManual, importCsv, categorize, exclude, remove, mortgageSplit } = useTransactions({ month });

  // Client-side filtering for Transactions tab
  const visibleTx = useMemo(() => {
    let tx = allTx;
    if (statusFilter)   tx = tx.filter(t => t.status === statusFilter);
    if (categoryFilter) tx = tx.filter(t => t.category_id === categoryFilter);
    return tx;
  }, [allTx, statusFilter, categoryFilter]);

  const handleImport = async (file) => {
    const result = await importCsv(file);
    if (result.imported > 0) {
      const duplicateNote = result.skipped > 0 ? ` · ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''} skipped` : '';
      toast.success(`Imported ${result.imported} transaction${result.imported !== 1 ? 's' : ''}${duplicateNote}${result.uncategorized > 0 ? ` · ${result.uncategorized} need review` : ''}`);
      setShowCsv(false);
      if (result.uncategorized > 0) setStatus('uncategorized');
    } else if (result.skipped > 0) {
      toast.success(`No new transactions · ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''} skipped`);
      setShowCsv(false);
    }
    if (result.errors?.length) result.errors.slice(0, 3).forEach(e => toast.error(e, { duration: 4000 }));
  };

  const handleAdd = async (tx) => {
    const { error } = await addManual(tx);
    if (!error) { toast.success('Transaction added'); setShowForm(false); }
  };

  const handleDelete = async (txId) => {
    if (!confirm('Delete this transaction?')) return;
    const { error } = await remove(txId);
    if (!error) toast.success('Deleted');
  };

  const handleMortgageSplit = async (txId, propertyId) => {
    const { error } = await mortgageSplit(txId, propertyId);
    if (!error) toast.success('Mortgage split into interest / principal / escrow');
  };

  // Drill-down from By Budget tab → switch to Transactions tab filtered by category
  const handleDrillDown = (categoryId, categoryName) => {
    setCategory(categoryId);
    setStatus('categorized');
    setTab('transactions');
    toast(`Showing: ${categoryName}`, { icon: '🔍', duration: 2000 });
  };

  const S = {
    select: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text-1)', fontSize: 13, outline: 'none' },
    btn:    { borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 6 },
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F4F4F5', margin: 0 }}>Spending</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '4px 0 0' }}>Track transactions · review your budget</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...S.btn, background: 'var(--bg-elevated)', color: 'var(--text-1)' }} onClick={() => setShowCsv(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Import CSV
          </button>
          <button style={{ ...S.btn, background: '#10B981', color: '#fff' }} onClick={() => setShowForm(true)}>
            + Add Transaction
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 0 }}>
        {[
          { key: 'transactions', label: 'Transactions' },
          { key: 'budget',       label: 'By Budget' },
          { key: 'visuals',      label: 'Visuals' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${tab === key ? '#10B981' : 'transparent'}`,
              color: tab === key ? '#10B981' : 'var(--text-2)',
              marginBottom: -1, transition: 'color .15s',
            }}
          >
            {label}
            {key === 'transactions' && uncategorizedCount > 0 && (
              <span style={{ marginLeft: 8, background: 'rgba(234,179,8,.18)', color: '#EAB308', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>
                {uncategorizedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Shared month picker ── */}
      <div style={{ marginBottom: 16 }}>
        <select style={S.select} value={month} onChange={e => setMonth(e.target.value)}>
          {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
      </div>

      {/* ══ TRANSACTIONS TAB ══ */}
      {tab === 'transactions' && (
        <>
          {/* Uncategorized banner */}
          {uncategorizedCount > 0 && (
            <div style={{ background: 'rgba(234,179,8,.08)', border: '1px solid rgba(234,179,8,.25)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>⚠</span>
                <div>
                  <p style={{ color: '#EAB308', fontWeight: 700, fontSize: 13, margin: 0 }}>{uncategorizedCount} transaction{uncategorizedCount !== 1 ? 's' : ''} need review</p>
                  <p style={{ color: '#A16207', fontSize: 12, margin: '2px 0 0' }}>Assign categories to keep your budget accurate</p>
                </div>
              </div>
              <button
                style={{ ...S.btn, background: 'rgba(234,179,8,.15)', color: '#EAB308', padding: '6px 12px', fontSize: 12 }}
                onClick={() => setStatus(statusFilter === 'uncategorized' ? '' : 'uncategorized')}
              >
                {statusFilter === 'uncategorized' ? 'Show all' : 'Review now'}
              </button>
            </div>
          )}

          {/* Filters row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select style={S.select} value={statusFilter} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="categorized">Categorized</option>
              <option value="uncategorized">Needs review</option>
              <option value="excluded">Excluded</option>
            </select>
            <select style={S.select} value={categoryFilter} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {(statusFilter || categoryFilter) && (
              <button
                style={{ ...S.btn, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '6px 12px', fontSize: 12 }}
                onClick={() => { setStatus(''); setCategory(''); }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
            ) : (
              <TransactionTable
                transactions={visibleTx}
                categories={categories}
                properties={properties}
                onCategorize={categorize}
                onExclude={exclude}
                onDelete={handleDelete}
                onMortgageSplit={handleMortgageSplit}
              />
            )}
          </div>

          {/* Footer count */}
          {!loading && visibleTx.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 16, color: 'var(--text-3)', fontSize: 12 }}>
              <span>{visibleTx.length} transactions shown</span>
              <span style={{ color: '#10B981' }}>{visibleTx.filter(t => t.status === 'categorized').length} categorized</span>
              {visibleTx.filter(t => t.status === 'uncategorized').length > 0 && (
                <span style={{ color: '#EAB308' }}>{visibleTx.filter(t => t.status === 'uncategorized').length} pending review</span>
              )}
            </div>
          )}
        </>
      )}

      {/* ══ BY BUDGET TAB ══ */}
      {tab === 'budget' && (
        <BudgetView
          transactions={allTx}
          lineItems={lineItems}
          month={month}
          onDrillDown={handleDrillDown}
        />
      )}

      {/* ══ VISUALS TAB ══ */}
      {tab === 'visuals' && (
        <LedgerVisuals
          transactions={allTx}
          categories={categories}
          lineItems={lineItems}
          month={month}
        />
      )}

      {/* ── Modals (portalled to body) ── */}
      {showCsv && createPortal(
        <CsvImportModal onImport={handleImport} onClose={() => setShowCsv(false)} importing={importing} />,
        document.body
      )}
      {showForm && createPortal(
        <TransactionForm
          categories={categories}
          properties={properties}
          onSave={handleAdd}
          onClose={() => setShowForm(false)}
        />,
        document.body
      )}
    </div>
  );
}
