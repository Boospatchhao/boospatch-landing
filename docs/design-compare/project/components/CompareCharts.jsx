// Spider chart for comparing two complexes across 5 axes
function SpiderChart({ a, b, size = 280, axes, labels }) {
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 40;
  const n = axes.length;

  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const ptFor = (i, val) => {
    const ang = angleFor(i);
    const d = (val / 100) * r;
    return [cx + Math.cos(ang) * d, cy + Math.sin(ang) * d];
  };

  const polyFor = (scoresObj) =>
    axes.map((k, i) => ptFor(i, scoresObj[k]).join(',')).join(' ');

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* rings */}
      {rings.map((f, i) => (
        <polygon key={i}
          points={axes.map((_, idx) => ptFor(idx, 100 * f).join(',')).join(' ')}
          fill="none" stroke="#e4e6ea" strokeWidth="1"
        />
      ))}
      {/* spokes */}
      {axes.map((_, i) => {
        const [x, y] = ptFor(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#f0f2f6" strokeWidth="1" />;
      })}
      {/* A polygon */}
      {a && (
        <polygon points={polyFor(a.scores)}
          fill={a.color} fillOpacity="0.15" stroke={a.color} strokeWidth="2"
          strokeLinejoin="round" />
      )}
      {/* B polygon */}
      {b && (
        <polygon points={polyFor(b.scores)}
          fill={b.color} fillOpacity="0.15" stroke={b.color} strokeWidth="2"
          strokeLinejoin="round" strokeDasharray="5 3" />
      )}
      {/* dots */}
      {a && axes.map((k, i) => {
        const [x, y] = ptFor(i, a.scores[k]);
        return <circle key={'a'+i} cx={x} cy={y} r="3.5" fill={a.color} />;
      })}
      {b && axes.map((k, i) => {
        const [x, y] = ptFor(i, b.scores[k]);
        return <circle key={'b'+i} cx={x} cy={y} r="3.5" fill={b.color} />;
      })}
      {/* labels */}
      {axes.map((k, i) => {
        const ang = angleFor(i);
        const lx = cx + Math.cos(ang) * (r + 22);
        const ly = cy + Math.sin(ang) * (r + 22);
        return (
          <text key={k} x={lx} y={ly} textAnchor="middle"
            fontSize="12" fontWeight="700" fill="#31353a"
            dominantBaseline="middle">
            {labels[k]}
          </text>
        );
      })}
    </svg>
  );
}

// Overlayed price line chart for two complexes
// Single-complex line chart with current-price callout
function PriceLineChart({ a, width = 720, height = 260 }) {
  return <AreaTrendChart data={a.priceSeries} priceDate={a.priceDate} width={width} height={height} unit="억" />;
}

function AreaTrendChart({ data, priceDate = '26.04', unit = '', width = 720, height = 260, labels }) {
  const p = { t: 24, r: 16, b: 36, l: 16 };
  const w = width, h = height;
  const innerW = w - p.l - p.r, innerH = h - p.t - p.b;

  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.05;
  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  const N = data.length;

  const xFor = (i) => p.l + (innerW * i) / (N - 1);
  const yFor = (v) => p.t + innerH * (1 - (v - min) / (max - min || 1));
  const yAvg = yFor(avg);

  const linePath = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(v)}`).join(' ');

  const xs = labels || ['2023', '2024', '2025', '2026'];

  // Current price point (last)
  const currentVal = data[N - 1];
  const cx = xFor(N - 1);
  const cy = yFor(currentVal);
  const above = currentVal >= avg;
  const lineColor = above ? '#ec432c' : '#06b281';

  // Badge positioning — anchor to the right of the last point, flipped to the left if it would overflow
  const badgeW = 108;
  const flip = cx + badgeW + 14 > w - p.r;
  const bx = flip ? cx - badgeW - 12 : cx + 12;
  const by = cy - 14;

  // Short date — "26.04.06" → "26.04"
  const shortDate = typeof priceDate === 'string' ? priceDate.slice(0, 5) : priceDate;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <clipPath id="above-avg"><rect x="0" y="0" width={w} height={yAvg} /></clipPath>
        <clipPath id="below-avg"><rect x="0" y={yAvg} width={w} height={h - yAvg} /></clipPath>
      </defs>

      {/* Split line — red above avg, green below */}
      <g clipPath="url(#above-avg)">
        <path d={linePath} fill="none" stroke="#ec432c" strokeWidth="2.25"
          strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g clipPath="url(#below-avg)">
        <path d={linePath} fill="none" stroke="#06b281" strokeWidth="2.25"
          strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Current-price crosshair guideline (subtle vertical to the axis) */}
      <line x1={cx} x2={cx} y1={cy} y2={p.t + innerH}
        stroke={lineColor} strokeWidth="1" strokeDasharray="2 3" opacity="0.4"/>

      {/* Current-price marker — halo + dot */}
      <circle cx={cx} cy={cy} r="8" fill={lineColor} opacity="0.2"/>
      <circle cx={cx} cy={cy} r="4.5" fill={lineColor}/>
      <circle cx={cx} cy={cy} r="2" fill="#fff"/>

      {/* Current-price badge */}
      <g transform={`translate(${bx}, ${by})`}>
        <rect x="0" y="0" width={badgeW} height="28" rx="8" fill="#1a1e23"/>
        <text x={badgeW / 2} y="18" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff"
          style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>
          <tspan fill="#9a9da2" fontWeight="500">{shortDate}</tspan>
          <tspan dx="8">{currentVal.toFixed(1)}{unit}</tspan>
        </text>
      </g>

      {/* x labels */}
      {xs.map((l, i) => (
        <text key={l} x={p.l + (innerW * i) / (xs.length - 1)} y={h - 10}
          textAnchor="middle" fontSize="11" fill="#7e8186"
          style={{ fontFamily: 'var(--font-sans)' }}>{l}년</text>
      ))}
    </svg>
  );
}

Object.assign(window, { SpiderChart, PriceLineChart, AreaTrendChart });
