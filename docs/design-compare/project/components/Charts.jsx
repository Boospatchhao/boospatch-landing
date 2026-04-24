// Boospatch Charts — inline-SVG recreation of the product's chart system
// Chart types from research/Frame 525.png:
//   1. LineChart + background histogram  → 호가 / 매매 & 전세 / 완성지수
//   2. ScatterChart + histogram          → 실거래가 (scatter dots over bars)
//   3. HeatMap                           → 전지 완성지수 (green gradient grid w/ labels)
//   4. MiniStatCard                       → number + line + tabs
// All charts use brand green as primary, red as secondary, purple for AI/comparison.

// ---------- primitives ---------------------------------------------------
const CHART_COLORS = {
  primary: '#06b281', primary2: '#18997d', primarySoft: '#e7f8f4',
  red: '#ec432c', redSoft: '#fdecea',
  purple: '#8d63e9', purpleSoft: '#efe9fc',
  blue: '#0b66e4',
  grid: '#f0f2f6', axis: '#b7babe', text: '#9a9da2',
  bar: '#e4e6ea',
};

function useSeed(seed = 1) {
  // deterministic PRNG for consistent demo data
  return React.useMemo(() => {
    let s = seed;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }, [seed]);
}

function ChartCard({ title, subtitle, value, valueColor = CHART_COLORS.primary, tabs, children, height = 200 }) {
  const [tab, setTab] = React.useState(tabs ? tabs[0] : null);
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e4e6ea',
      padding: '20px 22px 22px', fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1e23', marginBottom: 2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#9a9da2' }}>{subtitle}</div>}
        </div>
        {tabs && (
          <div style={{ display: 'inline-flex', background: '#f0f2f6', borderRadius: 6, padding: 2 }}>
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? '#fff' : 'transparent', border: 0, cursor: 'pointer',
                borderRadius: 4, padding: '4px 12px', fontSize: 11, fontWeight: 600,
                color: tab === t ? '#1a1e23' : '#7e8186',
                boxShadow: tab === t ? '0 1px 2px rgba(26,30,35,.08)' : 'none',
              }}>{t}</button>
            ))}
          </div>
        )}
      </div>
      {value !== undefined && (
        <div style={{ fontSize: 22, fontWeight: 800, color: valueColor, letterSpacing: '-0.02em',
                      fontVariantNumeric: 'tabular-nums', marginBottom: 10 }}>
          {value}
        </div>
      )}
      <div style={{ height }}>{children}</div>
    </div>
  );
}

// ---------- LineChart + histogram background ----------------------------
function LineChart({ series, width = 520, height = 180, padding = { t: 16, r: 12, b: 24, l: 12 } }) {
  const rand = useSeed(series.length * 7);
  const w = width, h = height, p = padding;
  const innerW = w - p.l - p.r, innerH = h - p.t - p.b;
  const N = series[0]?.points.length || 24;

  // histogram bars behind (random but stable)
  const bars = React.useMemo(() =>
    Array.from({ length: N }, () => 0.3 + rand() * 0.55), [N, rand]);

  const allPts = series.flatMap((s) => s.points);
  const min = Math.min(...allPts), max = Math.max(...allPts);
  const yFor = (v) => p.t + innerH * (1 - (v - min) / (max - min || 1));
  const xFor = (i) => p.l + (innerW * i) / (N - 1);

  // x-axis labels (years)
  const labels = ['2020', '2021', '2022', '2023', '2024', '2025'];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`lcg-${i}-${s.color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={s.color} stopOpacity={s.dashed ? 0 : 0.14}/>
            <stop offset="100%" stopColor={s.color} stopOpacity="0"/>
          </linearGradient>
        ))}
      </defs>

      {/* histogram bars */}
      {bars.map((v, i) => {
        const barW = innerW / (N * 1.5);
        return (
          <rect key={i} x={xFor(i) - barW / 2} y={p.t + innerH * (1 - v * 0.6)} width={barW}
                height={innerH * v * 0.6} fill={CHART_COLORS.bar} opacity="0.85" rx="1"/>
        );
      })}

      {/* grid baseline */}
      <line x1={p.l} x2={w - p.r} y1={h - p.b} y2={h - p.b} stroke={CHART_COLORS.grid}/>

      {/* soft fill under solid lines */}
      {series.map((s, i) => !s.dashed && (
        <path key={`f-${i}`} d={[
          `M ${xFor(0)} ${yFor(s.points[0])}`,
          ...s.points.slice(1).map((v, j) => `L ${xFor(j + 1)} ${yFor(v)}`),
          `L ${xFor(N - 1)} ${h - p.b}`, `L ${xFor(0)} ${h - p.b} Z`,
        ].join(' ')} fill={`url(#lcg-${i}-${s.color.slice(1)})`}/>
      ))}

      {/* lines */}
      {series.map((s, i) => (
        <polyline key={i} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.5 : 2}
                  strokeDasharray={s.dashed ? '4 4' : 'none'} strokeLinecap="round" strokeLinejoin="round"
                  points={s.points.map((v, j) => `${xFor(j)},${yFor(v)}`).join(' ')}/>
      ))}

      {/* x labels */}
      {labels.map((l, i) => (
        <text key={l} x={p.l + (innerW * i) / (labels.length - 1)} y={h - 6}
              textAnchor="middle" fontSize="10" fill={CHART_COLORS.text}>{l}</text>
      ))}
    </svg>
  );
}

// ---------- Scatter chart + histogram -----------------------------------
function ScatterChart({ width = 520, height = 180, padding = { t: 16, r: 12, b: 24, l: 12 } }) {
  const rand = useSeed(42);
  const w = width, h = height, p = padding;
  const innerW = w - p.l - p.r, innerH = h - p.t - p.b;
  const N = 24;
  const bars = React.useMemo(() => {
    // center-weighted histogram
    return Array.from({ length: N }, (_, i) => {
      const d = Math.abs(i - N / 2) / (N / 2);
      return (1 - d * 0.9) * (0.6 + rand() * 0.3);
    });
  }, [rand]);
  const dots = React.useMemo(() =>
    Array.from({ length: 80 }, () => ({
      x: rand(), y: 0.1 + rand() * 0.8,
      green: rand() > 0.35,
    })), [rand]);
  const xFor = (v) => p.l + v * innerW;
  const yFor = (v) => p.t + innerH * (1 - v);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" style={{ display: 'block' }}>
      {bars.map((v, i) => {
        const barW = innerW / (N * 1.4);
        const x = p.l + (innerW * (i + 0.5)) / N;
        return (
          <rect key={i} x={x - barW / 2} y={p.t + innerH * (1 - v * 0.8)} width={barW}
                height={innerH * v * 0.8} fill={CHART_COLORS.bar} rx="1"/>
        );
      })}
      <line x1={p.l} x2={w - p.r} y1={h - p.b} y2={h - p.b} stroke={CHART_COLORS.grid}/>
      {dots.map((d, i) => (
        <circle key={i} cx={xFor(d.x)} cy={yFor(d.y)} r="3"
                fill={d.green ? CHART_COLORS.primary : CHART_COLORS.red}
                opacity="0.85"/>
      ))}
      {['2020', '2021', '2022', '2023', '2024', '2025'].map((l, i, a) => (
        <text key={l} x={p.l + (innerW * i) / (a.length - 1)} y={h - 6}
              textAnchor="middle" fontSize="10" fill={CHART_COLORS.text}>{l}</text>
      ))}
    </svg>
  );
}

// ---------- Heatmap grid ------------------------------------------------
function HeatMap({ width = 520, height = 260, cols = 7, rows = 5,
                   cells = null, labels = ['대전','서울','세종','부산','인천','광주','대구'] }) {
  const rand = useSeed(11);
  const items = React.useMemo(() => {
    if (cells) return cells;
    // auto-generate: a few highlighted labeled cells
    return Array.from({ length: cols * rows }, (_, i) => {
      const v = rand();
      return {
        r: Math.floor(i / cols), c: i % cols,
        v: v,
        label: v > 0.7 ? Math.round(10 + v * 80) + '' : null,
      };
    });
  }, [cols, rows, rand, cells]);

  const cellW = width / cols, cellH = (height - 24) / rows;
  const colorFor = (v) => {
    // interpolate primarySoft → primary
    const a = Math.max(0, Math.min(1, v));
    return `rgba(6, 178, 129, ${0.08 + a * 0.55})`;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ display: 'block' }}>
      {items.map((it, i) => (
        <g key={i}>
          <rect x={it.c * cellW + 2} y={it.r * cellH + 2}
                width={cellW - 4} height={cellH - 4}
                fill={colorFor(it.v)} rx="6"/>
          {it.label && (
            <g>
              <rect x={it.c * cellW + cellW/2 - 18} y={it.r * cellH + cellH/2 - 10}
                    width="36" height="20" rx="10" fill={CHART_COLORS.primary}/>
              <text x={it.c * cellW + cellW/2} y={it.r * cellH + cellH/2 + 4}
                    textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{it.label}</text>
            </g>
          )}
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={l} x={i * cellW + cellW/2} y={height - 6}
              textAnchor="middle" fontSize="10" fill={CHART_COLORS.text}>{l}</text>
      ))}
    </svg>
  );
}

// ---------- Donut / gauge ----------------------------------------------
function Donut({ value = 72, max = 100, color = CHART_COLORS.primary,
                 size = 120, label, stroke = 12 }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f2f6" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`}
              transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2 - 2} textAnchor="middle" fontSize="22" fontWeight="800"
            fill="#1a1e23" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
        {value}
      </text>
      {label && (
        <text x={size/2} y={size/2 + 18} textAnchor="middle" fontSize="11" fill="#7e8186">{label}</text>
      )}
    </svg>
  );
}

// ---------- Bar chart (vertical) ---------------------------------------
function BarChart({ data, width = 520, height = 180, color = CHART_COLORS.primary,
                    labels = null }) {
  const padding = { t: 10, r: 8, b: 24, l: 8 };
  const innerW = width - padding.l - padding.r;
  const innerH = height - padding.t - padding.b;
  const max = Math.max(...data);
  const barW = innerW / data.length;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ display: 'block' }}>
      {data.map((v, i) => {
        const bh = (v / max) * innerH;
        return (
          <rect key={i} x={padding.l + i * barW + 2}
                y={padding.t + (innerH - bh)} width={barW - 4}
                height={bh} fill={color} rx="3" opacity="0.85"/>
        );
      })}
      {labels && labels.map((l, i) => (
        <text key={i} x={padding.l + i * barW + barW/2} y={height - 6}
              textAnchor="middle" fontSize="10" fill={CHART_COLORS.text}>{l}</text>
      ))}
    </svg>
  );
}

// ---------- Legend helper ----------------------------------------------
function Legend({ items, style }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', ...style }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7e8186' }}>
          <span style={{
            width: 16, height: 2, background: it.color, borderRadius: 1,
            borderTop: it.dashed ? `1.5px dashed ${it.color}` : 'none',
            background: it.dashed ? 'transparent' : it.color,
          }}/>
          {it.label}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ChartCard, LineChart, ScatterChart, HeatMap, Donut, BarChart, Legend, CHART_COLORS });
