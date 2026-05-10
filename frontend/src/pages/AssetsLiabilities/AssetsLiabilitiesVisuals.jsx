import { useMemo } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useLiabilities } from '../../hooks/useLiabilities';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import { PALETTE } from '../../utils/categoryColors';

// ── Radiant color palette for asset types ─────────────────────────────────────
const TYPE_COLORS = {
  'Real Estate':    '#00D28E',
  'Investment':     '#38BDF8',
  'Savings':        '#FBBF24',
  'Retirement':     '#818CF8',
  'Vehicle':        '#FB923C',
  'Cash':           '#A3E635',
  'Crypto':         '#E879F9',
  'Other':          '#2DD4BF',
};

function getTypeColor(type, idx) {
  return TYPE_COLORS[type] || PALETTE[idx % PALETTE.length];
}

// ── Dark tooltip ──────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    if (!d || !d.name) return null;
    return (
      <div style={{
        background: '#0F172A', border: '1px solid #334155', borderRadius: 10,
        padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', fontSize: 12,
      }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#F8FAFC' }}>{d.name}</p>
        {d.type && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94A3B8' }}>{d.type}</p>}
        <p style={{ margin: '6px 0 0', fontWeight: 700, color: d.color || '#00D28E', fontSize: 15 }}>
          {formatCurrency(d.value)}
        </p>
        {d.pct !== undefined && (
          <p style={{ margin: '2px 0 0', color: '#64748B', fontSize: 10 }}>{d.pct}% of total assets</p>
        )}
      </div>
    );
  }
  return null;
}

// ── Custom Treemap cell ───────────────────────────────────────────────────────
function CustomCell({ x, y, width, height, name, value, color, pct }) {
  if (width < 30 || height < 24) return null;
  const showLabel = width > 70 && height > 40;
  const showValue = width > 80 && height > 56;

  return (
    <g>
      <rect
        x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        rx={6} fill={color}
        fillOpacity={0.88}
        style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
      />
      {showLabel && (
        <>
          <text x={x + 10} y={y + 20} fill="#0F172A" fontSize={11} fontWeight={700}
            style={{ pointerEvents: 'none' }}>
            {name.length > 14 ? name.slice(0, 13) + '…' : name}
          </text>
          {showValue && (
            <text x={x + 10} y={y + 36} fill="rgba(0,0,0,0.65)" fontSize={10}>
              {formatCurrency(value)}  ·  {pct}%
            </text>
          )}
        </>
      )}
    </g>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AssetsLiabilitiesVisuals() {
  const { currentAssets: assets = [], total: totalAssets } = useAssets();
  const { currentLiabilities: liabilities = [], total: totalLiabilities } = useLiabilities();

  const netWorth = totalAssets - totalLiabilities;
  const liabilityRatio = totalAssets > 0 ? Math.min((totalLiabilities / totalAssets) * 100, 100) : 0;

  // Build treemap data — one cell per individual asset
  const { treeData, typeColors } = useMemo(() => {
    const typeSet = [...new Set(assets.map(a => a.type || 'Other'))];
    const tc = {};
    typeSet.forEach((t, i) => { tc[t] = getTypeColor(t, i); });

    const treeData = assets
      .filter(a => Number(a.amount) > 0)
      .map((a) => ({
        name:  a.name,
        type:  a.type || 'Other',
        value: Number(a.amount),
        color: tc[a.type || 'Other'],
        pct:   totalAssets > 0 ? ((Number(a.amount) / totalAssets) * 100).toFixed(1) : '0',
      }));

    return { treeData, typeColors: tc };
  }, [assets, totalAssets]);

  // Group by type for legend
  const typeGroups = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      const t = a.type || 'Other';
      map[t] = (map[t] || 0) + Number(a.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([type, amount]) => ({ type, amount, color: typeColors[type] }));
  }, [assets, typeColors]);

  const isEmpty = treeData.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Assets',      value: totalAssets,      color: '#00D28E', bg: 'rgba(0,210,142,0.08)',   border: 'rgba(0,210,142,0.2)' },
          { label: 'Total Liabilities', value: totalLiabilities, color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)' },
          { label: 'Net Worth',         value: netWorth,         color: netWorth >= 0 ? '#00D28E' : '#EF4444', bg: netWorth >= 0 ? 'rgba(0,210,142,0.08)' : 'rgba(239,68,68,0.08)', border: netWorth >= 0 ? 'rgba(0,210,142,0.2)' : 'rgba(239,68,68,0.2)' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
              {formatCurrency(Math.abs(value))}
            </p>
            {label === 'Net Worth' && value < 0 && (
              <p style={{ margin: '2px 0 0', fontSize: 9, color: '#EF4444' }}>negative</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Treemap ── */}
      <div style={{ background: '#0F172A', borderRadius: 14, padding: '18px 20px', border: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Wealth Composition</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748B' }}>Each block sized by asset value</p>
          </div>
          {/* Type legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', justifyContent: 'flex-end', maxWidth: '55%' }}>
            {typeGroups.slice(0, 6).map(({ type, color }) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#94A3B8' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                {type}
              </div>
            ))}
          </div>
        </div>

        {isEmpty ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13, flexDirection: 'column', gap: 8 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Add assets to see your wealth composition
          </div>
        ) : (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treeData}
                dataKey="value"
                aspectRatio={4 / 3}
                animationDuration={600}
                content={({ x, y, width, height, name, value, color, pct }) => (
                  <CustomCell x={x} y={y} width={width} height={height}
                    name={name} value={value} color={color} pct={pct}
                  />
                )}
              >
                <Tooltip content={<DarkTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Liability ratio bar ── */}
      {totalAssets > 0 && (
        <div style={{ background: '#1E293B', borderRadius: 12, padding: '14px 18px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>Liability-to-Asset Ratio</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: liabilityRatio > 40 ? '#EF4444' : liabilityRatio > 20 ? '#FB923C' : '#00D28E' }}>
              {liabilityRatio.toFixed(1)}%
              <span style={{ fontSize: 10, fontWeight: 400, color: '#64748B', marginLeft: 6 }}>
                {liabilityRatio < 15 ? '✓ Healthy' : liabilityRatio < 35 ? '⚠ Moderate' : '✗ High'}
              </span>
            </p>
          </div>
          <div style={{ height: 7, background: '#0F172A', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${liabilityRatio}%`,
              background: liabilityRatio > 40 ? 'linear-gradient(90deg,#F87171,#EF4444)'
                        : liabilityRatio > 20 ? 'linear-gradient(90deg,#FBBF24,#FB923C)'
                        : 'linear-gradient(90deg,#00D28E,#34D399)',
              borderRadius: 4,
              boxShadow: liabilityRatio < 20 ? '0 0 8px rgba(0,210,142,0.4)' : 'none',
              transition: 'width 0.8s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 10, color: '#64748B' }}>Assets {formatCurrency(totalAssets)}</span>
            <span style={{ fontSize: 10, color: '#64748B' }}>Liabilities {formatCurrency(totalLiabilities)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
