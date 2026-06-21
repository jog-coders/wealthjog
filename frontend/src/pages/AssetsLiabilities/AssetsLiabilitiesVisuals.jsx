import { useState, useMemo, useEffect } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useLiabilities } from '../../hooks/useLiabilities';
import { useBudget } from '../../hooks/useBudget';
import { useApi } from '../../hooks/useApi';
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

// ── Extended 24-colour palette — all visually distinct ────────────────────────
const EXTENDED_PALETTE = [
  '#38BDF8', '#00D28E', '#E879F9', '#FB923C', '#FBBF24',
  '#60A5FA', '#34D399', '#F472B6', '#A3E635', '#F87171',
  '#2DD4BF', '#818CF8', '#22D3EE', '#C084FC', '#FCD34D',
  '#4ADE80', '#FB7185', '#86EFAC', '#93C5FD', '#FDE68A',
  '#6EE7B7', '#A78BFA', '#FCA5A5', '#BAE6FD',
];

const LIABILITY_COLORS = ['#EF4444', '#F87171', '#FB923C', '#FBBF24', '#F472B6'];

// Soft colour preferences per type name
const TYPE_PREFS = {
  'Real Estate':          '#00D28E',
  'Property':             '#00D28E',
  'Home':                 '#00D28E',
  'Investment':           '#38BDF8',
  'Investment Brokerage': '#60A5FA',
  'Brokerage':            '#60A5FA',
  'Stock':                '#38BDF8',
  'Stocks':               '#38BDF8',
  'Savings':              '#FBBF24',
  'Savings Account':      '#FBBF24',
  'High Yield Savings':   '#FCD34D',
  'Retirement':           '#E879F9',
  'IRA':                  '#C084FC',
  '401k':                 '#818CF8',
  '401(k)':               '#818CF8',
  'Roth IRA':             '#A78BFA',
  'Checkings':            '#34D399',
  'Checking':             '#34D399',
  'Checking Account':     '#34D399',
  'Cash':                 '#A3E635',
  'Money Market':         '#4ADE80',
  'Vehicle':              '#FB923C',
  'Car':                  '#FB923C',
  'Auto':                 '#FB923C',
  'Crypto':               '#F472B6',
  'Cryptocurrency':       '#F472B6',
  'Bitcoin':              '#F472B6',
  'Other':                '#2DD4BF',
  'Misc':                 '#2DD4BF',
};

const DEFAULT_ASSET_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings',  label: 'Savings' },
  { value: 'investment_401k', label: '401(k)' },
  { value: 'investment_ira',  label: 'IRA' },
  { value: 'investment_brokerage', label: 'Brokerage' },
  { value: 'real_estate', label: 'Real Estate' },
];

// ── Single-pass collision-free colour assignment ───────────────────────────────
function buildTypeColorMap(typeSet) {
  const assigned   = {};
  const usedColors = new Set();
  let pi = 0;

  typeSet.forEach(type => {
    const preferred = TYPE_PREFS[type];
    if (preferred && !usedColors.has(preferred)) {
      assigned[type] = preferred;
      usedColors.add(preferred);
    } else {
      while (pi < EXTENDED_PALETTE.length && usedColors.has(EXTENDED_PALETTE[pi])) pi++;
      const color = EXTENDED_PALETTE[pi % EXTENDED_PALETTE.length];
      assigned[type] = color;
      usedColors.add(color);
      pi++;
    }
  });

  return assigned;
}

// ── Color utilities ───────────────────────────────────────────────────────────
function lightenHex(hex, amount = 0.35) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr},${lg},${lb})`;
}

function gradId(color) {
  return `tg${color.replace('#', '')}`;
}

// Liquidity groupings
function getLiquidityTier(type = '') {
  const t = type.toLowerCase();
  if (t === 'checking' || t === 'savings' || t.includes('cash') || t.includes('liquid')) {
    return 'liquid';
  }
  if (t === 'investment_brokerage' || t.includes('broker') || t.includes('stock') || t.includes('crypto') || t.includes('bitcoin')) {
    return 'invested';
  }
  return 'illiquid';
}

const LIQUIDITY_INFO = {
  liquid: { label: 'Liquid Cash', color: '#38BDF8', desc: 'Checking & savings accounts. Instantly accessible in emergencies.' },
  invested: { label: 'Marketable Investments', color: '#FBBF24', desc: 'Stocks, crypto & brokerages. Liquid in 1-3 business days.' },
  illiquid: { label: 'Retirement & Fixed Assets', color: '#C084FC', desc: 'Real Estate & retirement (401k/IRA). Penalty or delay to liquidate.' }
};

// ── Dark tooltip ──────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d || !d.name) return null;
  return (
    <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3.5 shadow-2xl text-xs pointer-events-none">
      <p className="font-bold text-[#F8FAFC]">{d.name}</p>
      {d.type && <p className="text-[10px] text-[#94A3B8] mt-0.5">{d.type}</p>}
      <p className="font-bold mt-1.5 text-base" style={{ color: d.color || '#00D28E' }}>
        {formatCurrency(d.value)}
      </p>
      {d.pct !== undefined && (
        <p className="text-[10px] text-[#64748B] mt-0.5">{d.pct}% of total assets</p>
      )}
    </div>
  );
}

// ── Custom Treemap cell ───────────────────────────────────────────────────────
function CustomCell(props) {
  const { depth, x, y, width, height, name, value, color, pct } = props;

  if (!depth || depth === 0 || !name || !width || !height) return <g />;
  if (width < 2 || height < 2) return <g />;

  const safeColor = color || '#00D28E';
  const gid       = `tg${safeColor.replace('#', '')}`;
  const safeName  = String(name);
  const showLabel = width > 60 && height > 36;
  const showValue = width > 80 && height > 54;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} fill={safeColor} fillOpacity={0.12} />
      <rect
        x={x + 1} y={y + 1}
        width={Math.max(width - 2, 0)} height={Math.max(height - 2, 0)}
        rx={7} fill={`url(#${gid})`}
        stroke={safeColor} strokeWidth={1} strokeOpacity={0.35}
      />
      {showLabel && (
        <text
          x={x + 10} y={y + 20}
          fill="#0A1628" fontSize={11} fontWeight={700}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {safeName.length > 14 ? safeName.slice(0, 13) + '…' : safeName}
        </text>
      )}
      {showValue && (
        <text
          x={x + 10} y={y + 35}
          fill="rgba(0,0,0,0.55)" fontSize={10}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {formatCurrency(value)}  ·  {pct}%
        </text>
      )}
    </g>
  );
}

export default function AssetsLiabilitiesVisuals() {
  const { get } = useApi();
  const { currentAssets: assets = [], total: totalAssets } = useAssets();
  const { currentLiabilities: liabilities = [], total: totalLiabilities } = useLiabilities();
  const { summary: budgetSummary } = useBudget();

  const [activeTab, setActiveTab] = useState('treemap');
  const [assetTypes, setAssetTypes] = useState(DEFAULT_ASSET_TYPES);

  useEffect(() => {
    get('/api/settings/lookup-values?domain=asset_type').then(({ data }) => {
      if (data && data.length > 0) setAssetTypes(data);
    });
  }, [get]);

  const netWorth      = totalAssets - totalLiabilities;
  const liabilityRatio = totalAssets > 0 ? Math.min((totalLiabilities / totalAssets) * 100, 100) : 0;
  const monthlyExpenses = budgetSummary?.fixedMonthlyTotal || 0;

  // Build type color map
  const assetColors = useMemo(() => {
    const typeSet = [...new Set(assets.map(a => a.type || 'Other'))];
    return buildTypeColorMap(typeSet);
  }, [assets]);

  // 1. Treemap Data Setup
  const treeData = useMemo(() => {
    return assets
      .filter(a => Number(a.amount) > 0)
      .map(a => ({
        name:  a.name,
        type:  assetTypes.find(t => t.value === a.type)?.label || a.type || 'Other',
        value: Number(a.amount),
        color: assetColors[a.type || 'Other'],
        pct:   totalAssets > 0 ? ((Number(a.amount) / totalAssets) * 100).toFixed(1) : '0',
      }));
  }, [assets, assetTypes, assetColors, totalAssets]);

  const typeGroups = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      const t = a.type || 'Other';
      if (!map[t]) map[t] = { amount: 0, color: assetColors[t] };
      map[t].amount += Number(a.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([type, { amount, color }]) => ({
        type: assetTypes.find(t => t.value === type)?.label || type,
        amount,
        color
      }));
  }, [assets, assetTypes, assetColors]);

  const uniqueColors = useMemo(() => [...new Set(treeData.map(d => d.color).filter(Boolean))], [treeData]);

  // 2. Asset Allocation Donut Data Setup
  const assetAllocData = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      const type = a.type || 'Other';
      if (!map[type]) map[type] = 0;
      map[type] += Number(a.amount);
    });
    return Object.entries(map)
      .map(([type, value]) => {
        const typeLabel = assetTypes.find(t => t.value === type)?.label || type;
        return {
          type,
          name: typeLabel,
          value,
          color: assetColors[type] || '#00D28E',
          pct: totalAssets > 0 ? ((value / totalAssets) * 100).toFixed(1) : '0'
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [assets, assetTypes, assetColors, totalAssets]);

  // Liabilities Category Allocation Donut Data Setup
  const liabilityAllocData = useMemo(() => {
    const map = {};
    liabilities.forEach(l => {
      const type = l.type || 'Other';
      if (!map[type]) map[type] = 0;
      map[type] += Number(l.amount);
    });
    return Object.entries(map)
      .map(([type, value], idx) => {
        const name = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
        return {
          type,
          name,
          value,
          color: LIABILITY_COLORS[idx % LIABILITY_COLORS.length],
          pct: totalLiabilities > 0 ? ((value / totalLiabilities) * 100).toFixed(1) : '0'
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [liabilities]);

  // 3. Liquidity Tiers Calculations
  const liquidityData = useMemo(() => {
    let liquid = 0;
    let invested = 0;
    let illiquid = 0;

    assets.forEach(a => {
      const tier = getLiquidityTier(a.type);
      const amt = Number(a.amount) || 0;
      if (tier === 'liquid') liquid += amt;
      else if (tier === 'invested') invested += amt;
      else illiquid += amt;
    });

    const sum = liquid + invested + illiquid;
    return {
      liquid,
      invested,
      illiquid,
      total: sum,
      liquidPct: sum > 0 ? (liquid / sum) * 100 : 0,
      investedPct: sum > 0 ? (invested / sum) * 100 : 0,
      illiquidPct: sum > 0 ? (illiquid / sum) * 100 : 0
    };
  }, [assets]);

  const coverageMonths = monthlyExpenses > 0 ? (liquidityData.liquid / monthlyExpenses) : 0;

  const isEmpty = treeData.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Assets',      value: totalAssets,      positive: true,           color: '#00D28E', bg: 'rgba(0,210,142,0.08)',   border: 'rgba(0,210,142,0.2)' },
          { label: 'Total Liabilities', value: totalLiabilities, positive: false,           color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
          { label: 'Net Worth',         value: netWorth,         positive: netWorth >= 0,   color: netWorth >= 0 ? '#00D28E' : '#F87171', bg: netWorth >= 0 ? 'rgba(0,210,142,0.08)' : 'rgba(248,113,113,0.08)', border: netWorth >= 0 ? 'rgba(0,210,142,0.2)' : 'rgba(248,113,113,0.2)' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
              {formatCurrency(Math.abs(value))}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tab Selector controls ── */}
      <div className="flex border-b border-gray-800 pb-2 space-x-6">
        <button
          onClick={() => setActiveTab('treemap')}
          className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors focus:outline-none ${
            activeTab === 'treemap' ? 'text-[#00D28E] border-b-2 border-[#00D28E]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          🗺️ Wealth Treemap
        </button>
        <button
          onClick={() => setActiveTab('allocation')}
          className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors focus:outline-none ${
            activeTab === 'allocation' ? 'text-[#00D28E] border-b-2 border-[#00D28E]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          🍩 Category Allocation
        </button>
        <button
          onClick={() => setActiveTab('liquidity')}
          className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors focus:outline-none ${
            activeTab === 'liquidity' ? 'text-[#00D28E] border-b-2 border-[#00D28E]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          💧 Liquidity Profile
        </button>
      </div>

      {/* ── View Rendering ── */}
      {isEmpty ? (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Add assets to see your dashboard visuals
        </div>
      ) : (
        <>
          {/* TAB 1: WEALTH COMPOSITION TREEMAP */}
          {activeTab === 'treemap' && (
            <div className="flex flex-col gap-6 animate-fade-up">
              <div style={{ background: 'var(--bg-main)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Wealth Composition</p>
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-3)' }}>Each block sized by asset value — hover for details</p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', justifyContent: 'flex-end' }}>
                    {typeGroups.slice(0, 7).map(({ type, color }) => (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-2)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                        {type}
                      </div>
                    ))}
                  </div>
                </div>

                <svg width={0} height={0} style={{ position: 'absolute', overflow: 'hidden' }} aria-hidden>
                  <defs>
                    {uniqueColors.map(color => (
                      <linearGradient key={color} id={gradId(color)} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%"   stopColor={lightenHex(color, 0.28)} stopOpacity={1}   />
                        <stop offset="55%"  stopColor={color}                   stopOpacity={0.95}/>
                        <stop offset="100%" stopColor={color}                   stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                </svg>

                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treeData}
                      dataKey="value"
                      aspectRatio={4 / 3}
                      animationDuration={500}
                      content={<CustomCell />}
                    >
                      <Tooltip content={<DarkTooltip />} />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Liability to Asset Ratio bar */}
              {totalAssets > 0 && (() => {
                const assetPct = Math.min(100, 100 - liabilityRatio);
                const liabPct  = Math.min(100, liabilityRatio);
                const health   = liabilityRatio < 15 ? { label: '✓ Healthy',   color: '#00D28E', bg: 'rgba(0,210,142,0.10)'   }
                               : liabilityRatio < 35 ? { label: '⚠ Moderate',  color: '#FBBF24', bg: 'rgba(251,191,36,0.10)'  }
                               :                       { label: '✗ High Debt',  color: '#F87171', bg: 'rgba(248,113,113,0.10)' };
                return (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Liability-to-Asset Ratio</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: health.color, background: health.bg, borderRadius: 99, padding: '3px 11px', border: `1px solid ${health.color}33` }}>
                        {health.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', height: 18, borderRadius: 9, overflow: 'hidden', gap: 2 }}>
                      <div style={{
                        flex: assetPct, minWidth: liabPct < 100 ? 4 : 0,
                        background: 'linear-gradient(90deg,#00B87D,#00D28E,#34D399)',
                        transition: 'flex 0.9s cubic-bezier(0.4,0,0.2,1)',
                        boxShadow: '0 0 10px rgba(0,210,142,0.3)',
                      }} />
                      {liabPct > 0 && (
                        <div style={{
                          flex: liabPct, minWidth: assetPct < 100 ? 4 : 0,
                          background: liabilityRatio > 40
                            ? 'linear-gradient(90deg,#EF4444,#F87171)'
                            : liabilityRatio > 20
                            ? 'linear-gradient(90deg,#FB923C,#FBBF24)'
                            : 'linear-gradient(90deg,#FBBF24,#FDE68A)',
                          transition: 'flex 0.9s cubic-bezier(0.4,0,0.2,1)',
                        }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(135deg,#00D28E,#34D399)', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Assets</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#00D28E', letterSpacing: '-0.01em' }}>{formatCurrency(totalAssets)}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>({assetPct.toFixed(1)}%)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: liabilityRatio > 40 ? 'linear-gradient(135deg,#EF4444,#F87171)' : liabilityRatio > 20 ? 'linear-gradient(135deg,#FB923C,#FBBF24)' : 'linear-gradient(135deg,#FBBF24,#FDE68A)', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Liabilities</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: liabilityRatio > 35 ? '#F87171' : liabilityRatio > 20 ? '#FB923C' : '#FBBF24', letterSpacing: '-0.01em' }}>{formatCurrency(totalLiabilities)}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>({liabPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: CATEGORY ALLOCATION */}
          {activeTab === 'allocation' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
              {/* Asset Allocation Panel */}
              <div style={{ background: 'var(--bg-main)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)' }}>
                <h3 className="text-sm font-bold text-[#F8FAFC] mb-1">Asset Category Split</h3>
                <p className="text-[10px] text-gray-500 mb-4">Breakdown of holdings by asset class</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetAllocData}
                          cx="50%"
                          cy="50%"
                          innerRadius="65%"
                          outerRadius="85%"
                          paddingAngle={assetAllocData.length > 1 ? 3 : 0}
                          dataKey="value"
                        >
                          {assetAllocData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                          <Label position="center" content={({ viewBox: { cx, cy } }) => (
                            <g>
                              <text x={cx} y={cy - 6} textAnchor="middle" fill="#94A3B8" fontSize={8} fontWeight={600} letterSpacing="0.04em">ASSETS</text>
                              <text x={cx} y={cy + 10} textAnchor="middle" fill="#00D28E" fontSize={12} fontWeight={800}>{formatCurrency(totalAssets)}</text>
                            </g>
                          )} />
                        </Pie>
                        <Tooltip formatter={val => formatCurrency(val)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {assetAllocData.map(item => (
                      <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-gray-800/40">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-300 truncate">{item.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-semibold text-[#F8FAFC]">{formatCurrency(item.value)}</span>
                          <span className="text-[10px] text-gray-500 ml-1.5">({item.pct}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Liabilities Allocation Panel (if there are any) */}
              {totalLiabilities > 0 ? (
                <div style={{ background: 'var(--bg-main)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)' }}>
                  <h3 className="text-sm font-bold text-[#F8FAFC] mb-1">Debt Category Split</h3>
                  <p className="text-[10px] text-gray-500 mb-4">Breakdown of obligations by liability type</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={liabilityAllocData}
                            cx="50%"
                            cy="50%"
                            innerRadius="65%"
                            outerRadius="85%"
                            paddingAngle={liabilityAllocData.length > 1 ? 3 : 0}
                            dataKey="value"
                          >
                            {liabilityAllocData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                            <Label position="center" content={({ viewBox: { cx, cy } }) => (
                              <g>
                                <text x={cx} y={cy - 6} textAnchor="middle" fill="#94A3B8" fontSize={8} fontWeight={600} letterSpacing="0.04em">DEBT</text>
                                <text x={cx} y={cy + 10} textAnchor="middle" fill="#EF4444" fontSize={12} fontWeight={800}>{formatCurrency(totalLiabilities)}</text>
                              </g>
                            )} />
                          </Pie>
                          <Tooltip formatter={val => formatCurrency(val)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {liabilityAllocData.map(item => (
                        <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-gray-800/40">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-300 truncate">{item.name}</span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="font-semibold text-red-400">{formatCurrency(item.value)}</span>
                            <span className="text-[10px] text-gray-500 ml-1.5">({item.pct}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Static Panel when no liabilities exist */
                <div style={{ background: 'var(--bg-main)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  <div className="w-12 h-12 rounded-full bg-[#00D28E]/10 flex items-center justify-center text-[#00D28E] text-xl mb-3">✓</div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">Debt Free 🎯</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">You have no recorded liabilities. Your total assets directly represent your net worth without leverage.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIQUIDITY PROFILE */}
          {activeTab === 'liquidity' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
              {/* Liquidity breakdown card */}
              <div style={{ background: 'var(--bg-main)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)' }} className="flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#F8FAFC] mb-1">Asset Liquidity Tiers</h3>
                  <p className="text-[10px] text-gray-500 mb-5">Speed of converting your holdings into cash reserves</p>
                </div>

                {/* Progress bar */}
                <div className="h-6 w-full rounded-lg bg-gray-800 flex overflow-hidden mb-6 gap-[1px]">
                  {liquidityData.liquidPct > 0 && (
                    <div
                      style={{
                        flex: liquidityData.liquidPct,
                        background: 'linear-gradient(90deg,#0284C7,#38BDF8)',
                        boxShadow: '0 0 8px rgba(56,189,248,0.2)'
                      }}
                      title={`Liquid Cash: ${liquidityData.liquidPct.toFixed(1)}%`}
                    />
                  )}
                  {liquidityData.investedPct > 0 && (
                    <div
                      style={{
                        flex: liquidityData.investedPct,
                        background: 'linear-gradient(90deg,#D97706,#FBBF24)',
                        boxShadow: '0 0 8px rgba(251,191,36,0.2)'
                      }}
                      title={`Investments: ${liquidityData.investedPct.toFixed(1)}%`}
                    />
                  )}
                  {liquidityData.illiquidPct > 0 && (
                    <div
                      style={{
                        flex: liquidityData.illiquidPct,
                        background: 'linear-gradient(90deg,#7C3AED,#C084FC)'
                      }}
                      title={`Retirement/Fixed: ${liquidityData.illiquidPct.toFixed(1)}%`}
                    />
                  )}
                </div>

                {/* Cards for each tier */}
                <div className="space-y-3">
                  {['liquid', 'invested', 'illiquid'].map(tier => {
                    const info = LIQUIDITY_INFO[tier];
                    const amount = liquidityData[tier];
                    const pct = liquidityData[`${tier}Pct`].toFixed(1);
                    return (
                      <div key={tier} className="bg-[#1E293B]/40 border border-[#334155]/50 rounded-xl p-3.5 flex items-start gap-3 justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
                            <span className="text-xs font-bold text-[#F8FAFC]">{info.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-normal max-w-xs">{info.desc}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#F8FAFC]">{formatCurrency(amount)}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{pct}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Emergency Fund Index Card */}
              <div style={{ background: 'var(--bg-main)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)' }} className="flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#F8FAFC] mb-1">Emergency Fund Index</h3>
                  <p className="text-[10px] text-gray-500 mb-6">How many months of fixed living costs your liquid cash can support</p>
                </div>

                {monthlyExpenses > 0 ? (
                  <div className="flex-grow flex flex-col justify-center items-center py-6 space-y-4">
                    {/* Visual Meter Circle */}
                    <div className="relative w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 border-[#1E293B] shadow-inner">
                      <div className="absolute inset-0 rounded-full border-4" style={{
                        borderColor: coverageMonths >= 6 ? '#00D28E' : coverageMonths >= 3 ? '#38BDF8' : '#EF4444',
                        clipPath: `polygon(50% 50%, -50% -50%, ${coverageMonths >= 6 ? '150% 150%' : '150% 0%'})` // basic arc indicator
                      }} />
                      <p className="text-2xl font-black text-[#F8FAFC] leading-none">{coverageMonths.toFixed(1)}</p>
                      <p className="text-[9px] text-gray-500 font-semibold uppercase mt-1 tracking-wider">Months</p>
                    </div>

                    <div className="text-center space-y-1">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                        coverageMonths >= 6 ? 'bg-green-950 text-green-400 border border-green-900' :
                        coverageMonths >= 3 ? 'bg-blue-950 text-blue-400 border border-blue-900' :
                        'bg-red-950 text-red-400 border border-red-900'
                      }`}>
                        {coverageMonths >= 6 ? 'Excellent Coverage (6+ Mo)' :
                         coverageMonths >= 3 ? 'Healthy Coverage (3-6 Mo)' :
                         'Low Coverage (<3 Mo)'}
                      </span>
                      <p className="text-[11px] text-gray-400 pt-2">
                        Your liquid cash reserves ({formatCurrency(liquidityData.liquid)}) cover <b>{coverageMonths.toFixed(1)} months</b> of your <b>{formatCurrency(monthlyExpenses)}/mo</b> fixed costs.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col justify-center items-center py-10 text-center space-y-3">
                    <span className="text-2xl">🚨</span>
                    <h4 className="text-xs font-bold text-gray-400">Fixed expenses unconfigured</h4>
                    <p className="text-[10px] text-gray-500 max-w-xs leading-normal">
                      Fixed monthly costs are unconfigured in your Budget tab. Please define your recurring expenses in the budget module to unlock your emergency coverage analysis.
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-800 pt-4 mt-2">
                  <p className="text-[10px] text-gray-500 italic leading-normal">
                    💡 <b>Recommendation:</b> Keeping 3 to 6 months of fixed living expenses in immediate liquid cash safeguards against job loss, emergency medical bills, or property maintenance surprises without forcing you to liquidate long-term investments.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
