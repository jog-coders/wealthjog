import { useMemo } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useLiabilities } from '../../hooks/useLiabilities';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import { PALETTE } from '../../utils/categoryColors';

// ── Named color map — covers all common asset type names & variations ─────────
const TYPE_COLORS = {
  // Real estate
  'Real Estate':          '#00D28E',
  'Property':             '#00D28E',
  'Home':                 '#00D28E',
  // Investments
  'Investment':           '#38BDF8',
  'Investment Brokerage': '#60A5FA',
  'Brokerage':            '#60A5FA',
  'Stock':                '#38BDF8',
  'Stocks':               '#38BDF8',
  // Savings
  'Savings':              '#FBBF24',
  'Savings Account':      '#FBBF24',
  'High Yield Savings':   '#F59E0B',
  // Retirement
  'Retirement':           '#E879F9',
  'IRA':                  '#E879F9',
  '401k':                 '#D946EF',
  '401(k)':               '#D946EF',
  'Roth IRA':             '#C026D3',
  // Checking / Cash
  'Checkings':            '#34D399',
  'Checking':             '#34D399',
  'Checking Account':     '#34D399',
  'Cash':                 '#A3E635',
  'Money Market':         '#84CC16',
  // Vehicle
  'Vehicle':              '#FB923C',
  'Car':                  '#FB923C',
  'Auto':                 '#FB923C',
  // Crypto
  'Crypto':               '#818CF8',
  'Cryptocurrency':       '#818CF8',
  'Bitcoin':              '#6366F1',
  // Other
  'Other':                '#2DD4BF',
  'Misc':                 '#2DD4BF',
};

// ── Collision-free color assignment ──────────────────────────────────────────
// Pass 1: assign named colors. Pass 2: unknowns get the next unused palette slot.
function buildTypeColorMap(typeSet) {
  const assigned  = {};
  const usedColors = new Set();

  // Pass 1 — named types
  typeSet.forEach(type => {
    if (TYPE_COLORS[type]) {
      assigned[type] = TYPE_COLORS[type];
      usedColors.add(TYPE_COLORS[type]);
    }
  });

  // Pass 2 — unknown types get next unused palette color
  let pi = 0;
  typeSet.forEach(type => {
    if (!assigned[type]) {
      while (pi < PALETTE.length && usedColors.has(PALETTE[pi])) pi++;
      const color = PALETTE[pi % PALETTE.length];
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

// ── Dark tooltip ──────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d || !d.name) return null;
  return (
    <div style={{
      background: '#0F172A', border: '1px solid #334155', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', fontSize: 12,
      pointerEvents: 'none',
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

// ── Custom Treemap cell ───────────────────────────────────────────────────────
// IMPORTANT: recharts calls content for the invisible root node (depth=0)
// where name/color are undefined — always guard against that.
function CustomCell(props) {
  const { depth, x, y, width, height, name, value, color, pct } = props;

  // Skip root node (depth 0) and degenerate cells
  if (!depth || depth === 0 || !name || !width || !height) return <g />;
  if (width < 2 || height < 2) return <g />;

  const safeColor = color || '#00D28E';
  const gid       = `tg${safeColor.replace('#', '')}`;
  const safeName  = String(name);
  const showLabel = width > 60 && height > 36;
  const showValue = width > 80 && height > 54;

  return (
    <g>
      {/* Glow bloom behind cell */}
      <rect x={x} y={y} width={width} height={height}
        rx={8} fill={safeColor} fillOpacity={0.12} />
      {/* Gradient-filled cell */}
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function AssetsLiabilitiesVisuals() {
  const { currentAssets: assets = [], total: totalAssets } = useAssets();
  const { currentLiabilities: liabilities = [], total: totalLiabilities } = useLiabilities();

  const netWorth      = totalAssets - totalLiabilities;
  const liabilityRatio = totalAssets > 0 ? Math.min((totalLiabilities / totalAssets) * 100, 100) : 0;

  // Build treemap data — one cell per individual asset
  const treeData = useMemo(() => {
    const typeSet = [...new Set(assets.map(a => a.type || 'Other'))];
    const tc = buildTypeColorMap(typeSet);

    return assets
      .filter(a => Number(a.amount) > 0)
      .map(a => ({
        name:  a.name,
        type:  a.type || 'Other',
        value: Number(a.amount),
        color: tc[a.type || 'Other'],
        pct:   totalAssets > 0 ? ((Number(a.amount) / totalAssets) * 100).toFixed(1) : '0',
      }));
  }, [assets, totalAssets]);

  // Color map for legend — use same buildTypeColorMap so colors stay in sync
  const typeGroups = useMemo(() => {
    const typeSet = [...new Set(assets.map(a => a.type || 'Other'))];
    const tc = buildTypeColorMap(typeSet);
    const map = {};
    assets.forEach(a => {
      const t = a.type || 'Other';
      if (!map[t]) map[t] = { amount: 0, color: tc[t] };
      map[t].amount += Number(a.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([type, { amount, color }]) => ({ type, amount, color }));
  }, [assets]);

  // Unique colors for gradient defs
  const uniqueColors = useMemo(() => [...new Set(treeData.map(d => d.color).filter(Boolean))], [treeData]);

  const isEmpty = treeData.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Assets',      value: totalAssets,      positive: true,           color: '#00D28E', bg: 'rgba(0,210,142,0.08)',   border: 'rgba(0,210,142,0.2)' },
          { label: 'Total Liabilities', value: totalLiabilities, positive: false,           color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
          { label: 'Net Worth',         value: netWorth,         positive: netWorth >= 0,   color: netWorth >= 0 ? '#00D28E' : '#F87171', bg: netWorth >= 0 ? 'rgba(0,210,142,0.08)' : 'rgba(248,113,113,0.08)', border: netWorth >= 0 ? 'rgba(0,210,142,0.2)' : 'rgba(248,113,113,0.2)' },
        ].map(({ label, value, color, bg, border, positive }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
              {formatCurrency(Math.abs(value))}
            </p>
          </div>
        ))}
      </div>

      {/* ── Wealth Composition Treemap ── */}
      <div style={{ background: '#0F172A', borderRadius: 14, padding: '18px 20px', border: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Wealth Composition</p>
            <p style={{ margin: '3px 0 0', fontSize: 10, color: '#64748B' }}>Each block sized by asset value — hover for details</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', justifyContent: 'flex-end' }}>
            {typeGroups.slice(0, 7).map(({ type, color }) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#94A3B8' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                {type}
              </div>
            ))}
          </div>
        </div>

        {/* Hidden SVG gradient + filter defs — referenced by all treemap cells */}
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

        {isEmpty ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: '#475569', fontSize: 13, textAlign: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round">
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
                animationDuration={500}
                content={<CustomCell />}
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
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: liabilityRatio > 40 ? '#F87171' : liabilityRatio > 20 ? '#FB923C' : '#00D28E' }}>
              {liabilityRatio.toFixed(1)}%
              <span style={{ fontSize: 10, fontWeight: 400, color: '#64748B', marginLeft: 6 }}>
                {liabilityRatio < 15 ? '✓ Healthy' : liabilityRatio < 35 ? '⚠ Moderate' : '✗ High'}
              </span>
            </p>
          </div>
          <div style={{ height: 7, background: '#0F172A', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${liabilityRatio}%`, borderRadius: 4,
              background: liabilityRatio > 40
                ? 'linear-gradient(90deg,#F87171,#EF4444)'
                : liabilityRatio > 20
                ? 'linear-gradient(90deg,#FBBF24,#FB923C)'
                : 'linear-gradient(90deg,#00D28E,#34D399)',
              boxShadow: liabilityRatio < 20 ? '0 0 8px rgba(0,210,142,0.35)' : 'none',
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
