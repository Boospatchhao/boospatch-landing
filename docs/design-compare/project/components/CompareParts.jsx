// Main Compare view — all 4 parts + CTAs + share + history + Fight + personalization

function CompareHeader({ a, b, onSwap, onSearch, onHistory }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e4e6ea', padding: '18px 32px', position: 'sticky', top: 0, zIndex: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>단지 비교</h2>
        <span style={{ fontSize: 11, color: '#9a9da2' }}>2026.04 기준 · 국토부 실거래가</span>
        <div style={{ flex: 1 }} />
        <Button variant="outline" size="sm" onClick={onHistory}>
          <BPIcons.Refresh size={13} /> 최근 비교 5개
        </Button>
        <Button variant="outline" size="sm">
          <BPIcons.Excel size={13} stroke="#06b281" /> 결과 공유
        </Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, alignItems: 'center' }}>
        <ComplexPicker complex={a} label="단지 A" onSearch={() => onSearch('a')} />
        <button onClick={onSwap} style={{
          width: 40, height: 40, borderRadius: 999, border: '1px solid #e4e6ea',
          background: '#fff', cursor: 'pointer', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', color: '#494d52',
        }} title="좌우 전환">
          <BPIcons.Refresh size={16} />
        </button>
        <ComplexPicker complex={b} label="단지 B" onSearch={() => onSearch('b')} />
      </div>
    </div>
  );
}

function ComplexPicker({ complex, label, onSearch }) {
  if (!complex) {
    return (
      <button onClick={onSearch} style={{
        padding: '14px 18px', borderRadius: 12, border: '1.5px dashed #b7babe',
        background: '#f8f9fc', color: '#7e8186', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left',
      }}>
        <div style={{ fontSize: 11, color: '#9a9da2', marginBottom: 4 }}>{label}</div>
        + 비교할 단지 추가
      </button>
    );
  }
  return (
    <button onClick={onSearch} style={{
      padding: '12px 16px', borderRadius: 12, border: '1px solid #e4e6ea',
      background: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)',
      textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, background: complex.color + '1a',
        color: complex.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, flexShrink: 0,
      }}>{complex.name[0]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#9a9da2', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1e23', letterSpacing: '-0.02em' }}>
          {complex.name}
        </div>
        <div style={{ fontSize: 11, color: '#7e8186' }}>{complex.address}</div>
      </div>
      <BPIcons.Edit size={14} stroke="#9a9da2" />
    </button>
  );
}

// ----- Part 1: price line chart -----
function PricePart({ a, b }) {
  const [mode, setMode] = React.useState('both');
  const [range, setRange] = React.useState('5y');
  return (
    <SectionCard title="시세 추이" subtitle="매매가 · 전세가 · 최근 5년 실거래 기준">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <TabGroup value={mode} onChange={setMode} options={[
          { value: 'both', label: '매매·전세' },
          { value: 'sale', label: '매매가' },
          { value: 'rent', label: '전세가' },
        ]} />
        <div style={{ flex: 1 }} />
        <TabGroup value={range} onChange={setRange} options={[
          { value: '3y', label: '3년' },
          { value: '5y', label: '5년' },
          { value: 'all', label: '전체' },
        ]} />
      </div>
      <PriceLineChart a={a} b={b} mode={mode} range={range} />
      <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap', fontSize: 12 }}>
        <LegendItem color={a.color} label={`${a.name} 매매`} />
        <LegendItem color={b.color} label={`${b.name} 매매`} />
        <LegendItem color={a.color} label={`${a.name} 전세`} dashed />
        <LegendItem color={b.color} label={`${b.name} 전세`} dashed />
      </div>
    </SectionCard>
  );
}

function LegendItem({ color, label, dashed }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#63666c' }}>
      <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3"
        stroke={color} strokeWidth="2" strokeDasharray={dashed ? '4 3' : 'none'} strokeLinecap="round"/></svg>
      {label}
    </div>
  );
}

function TabGroup({ value, onChange, options }) {
  return (
    <div style={{ display: 'inline-flex', background: '#f0f2f6', borderRadius: 8, padding: 3 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          background: value === o.value ? '#fff' : 'transparent', border: 0, cursor: 'pointer',
          borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700,
          color: value === o.value ? '#1a1e23' : '#7e8186',
          boxShadow: value === o.value ? '0 1px 2px rgba(26,30,35,.08)' : 'none',
          fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, actions, children }) {
  return (
    <section style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e4e6ea', padding: '24px 28px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h3>
          {subtitle && <div style={{ fontSize: 12, color: '#9a9da2', marginTop: 3 }}>{subtitle}</div>}
        </div>
        <div style={{ flex: 1 }} />
        {actions}
      </div>
      {children}
    </section>
  );
}

// ----- Part 2: specs table -----
function SpecsPart({ a, b }) {
  const rows = [
    ['현재 시세', a.currentPrice, b.currentPrice, 'highlight'],
    ['1년 변동률', `${a.priceDelta > 0 ? '+' : ''}${a.priceDelta}%`, `${b.priceDelta > 0 ? '+' : ''}${b.priceDelta}%`, 'delta'],
    ['전세가', a.rent, b.rent],
    ['준공연도', `${a.built}년`, `${b.built}년`],
    ['세대수', `${a.households.toLocaleString()}세대`, `${b.households.toLocaleString()}세대`],
    ['용적률 / 건폐율', `${a.floorAreaRatio}% / ${a.buildingRatio}%`, `${b.floorAreaRatio}% / ${b.buildingRatio}%`],
    ['층수', a.floors, b.floors],
    ['세대당 주차', `${a.parking}대`, `${b.parking}대`],
    ['시공사', a.builder, b.builder],
  ];
  return (
    <SectionCard title="기본 스펙" subtitle="두 단지의 기본 정보를 나란히 비교합니다">
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', borderTop: '1px solid #e4e6ea' }}>
        {/* column headers */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e4e6ea', background: '#f8f9fc', fontSize: 11, color: '#7e8186', fontWeight: 700 }}>항목</div>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e4e6ea', background: '#f8f9fc', borderLeft: '1px solid #e4e6ea',
          fontSize: 13, fontWeight: 700, color: a.color }}>{a.name}</div>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e4e6ea', background: '#f8f9fc', borderLeft: '1px solid #e4e6ea',
          fontSize: 13, fontWeight: 700, color: b.color }}>{b.name}</div>

        {rows.map(([label, va, vb, kind], i) => (
          <React.Fragment key={i}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f2f6', fontSize: 12, color: '#63666c' }}>{label}</div>
            <SpecCell value={va} kind={kind} emphasize={kind === 'highlight'} />
            <SpecCell value={vb} kind={kind} emphasize={kind === 'highlight'} />
          </React.Fragment>
        ))}
      </div>
    </SectionCard>
  );
}

function SpecCell({ value, kind, emphasize }) {
  let color = '#1a1e23';
  if (kind === 'delta') {
    if (value.startsWith('+')) color = '#06b281';
    else if (value.startsWith('-')) color = '#ec432c';
  }
  return (
    <div style={{
      padding: '14px 16px', borderBottom: '1px solid #f0f2f6', borderLeft: '1px solid #f0f2f6',
      fontSize: emphasize ? 17 : 13, fontWeight: emphasize ? 800 : 600, color,
      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
    }}>{value}</div>
  );
}

// ----- Part 3: spider chart + scores + AI summary + personalization -----
function ScorePart({ a, b, weights, onOpenWeights }) {
  const axes = ['traffic', 'school', 'newness', 'environment', 'investment'];
  // calculate personalized score
  const wSum = Object.values(weights).reduce((s, v) => s + v, 0) || 1;
  const calc = (sc) => axes.reduce((s, k) => s + sc[k] * (weights[k] / wSum), 0);
  const scoreA = calc(a.scores);
  const scoreB = calc(b.scores);
  const winner = scoreA >= scoreB ? a : b;
  const loser = scoreA >= scoreB ? b : a;

  return (
    <SectionCard
      title="상품성 · 입지 점수"
      subtitle="5개 항목 100점 만점 · 부스패치 자체 점수"
      actions={
        <Button variant="outline" size="sm" onClick={onOpenWeights}>
          <BPIcons.Edit size={12} /> 나만의 우선순위
        </Button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32, alignItems: 'center' }}>
        <SpiderChart a={a} b={b} axes={axes} labels={SCORE_LABELS} />
        <div>
          {/* Axis rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {axes.map((k) => (
              <ScoreRow key={k} label={SCORE_LABELS[k]} a={a} b={b} axis={k} weight={weights[k]} />
            ))}
          </div>
          {/* AI summary */}
          <div style={{
            background: 'linear-gradient(90deg, #efe9fc 0%, #f8f5ff 100%)',
            borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: '#8d63e9', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
              flexShrink: 0,
            }}>AI</div>
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.65, color: '#31353a' }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#8d63e9' }}>
                나의 우선순위 기준 Winner
              </div>
              <strong>{winner.name}</strong> ({scoreA >= scoreB ? scoreA.toFixed(1) : scoreB.toFixed(1)}점)이 {loser.name} ({scoreA >= scoreB ? scoreB.toFixed(1) : scoreA.toFixed(1)}점) 대비 <strong>{Math.abs(scoreA - scoreB).toFixed(1)}점</strong> 앞섭니다. 특히 <strong>{topDiffAxis(a, b, weights)}</strong> 항목에서 격차가 큽니다.
            </div>
          </div>
        </div>
      </div>

      {/* CTA #1 */}
      <div style={{ marginTop: 20 }}>
        <CtaBanner
          text="이 비교, 전문가 의견은?"
          sub="20년 경력 부동산 전문가가 내 상황에 맞춘 분석을 드립니다"
          cta="전문가 컨설팅 받기"
          variant="primary"
        />
      </div>
    </SectionCard>
  );
}

function topDiffAxis(a, b, weights) {
  const axes = ['traffic', 'school', 'newness', 'environment', 'investment'];
  let top = axes[0], max = 0;
  for (const k of axes) {
    const d = Math.abs(a.scores[k] - b.scores[k]) * (weights[k] / 100);
    if (d > max) { max = d; top = k; }
  }
  return SCORE_LABELS[top];
}

function ScoreRow({ label, a, b, axis, weight }) {
  const va = a.scores[axis], vb = b.scores[axis];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#31353a', width: 56 }}>{label}</span>
        <span style={{ fontSize: 10, color: '#9a9da2', background: '#f0f2f6', padding: '2px 6px', borderRadius: 4 }}>가중치 {weight}%</span>
        <div style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr 44px', gap: 6, alignItems: 'center' }}>
        {/* A bar (right-aligned) */}
        <div style={{ height: 8, background: '#f0f2f6', borderRadius: 4, position: 'relative', overflow: 'hidden', direction: 'rtl' }}>
          <div style={{ height: '100%', width: `${va}%`, background: a.color, borderRadius: 4 }}/>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: a.color, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{va}</span>
        {/* B bar */}
        <div style={{ height: 8, background: '#f0f2f6', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${vb}%`, background: b.color, borderRadius: 4 }}/>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: b.color, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{vb}</span>
      </div>
    </div>
  );
}

// ----- Part 4: listings -----
function ListingsPart({ a, b }) {
  return (
    <SectionCard title="현재 매물" subtitle="네이버 부동산 기준 · 참고용">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ListingColumn c={a} />
        <ListingColumn c={b} />
      </div>
      <div style={{ marginTop: 20 }}>
        <CtaBanner
          text="지금 사도 될까요?"
          sub="실제 매물 상담은 부스패치 전문 상담사에게"
          cta="매물 상담 받기"
          variant="dark"
        />
      </div>
    </SectionCard>
  );
}

function ListingColumn({ c }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid #e4e6ea', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: c.color + '12', borderBottom: '1px solid #e4e6ea',
        fontSize: 13, fontWeight: 700, color: c.color }}>{c.name}</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {c.listings.map((l, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 12, alignItems: 'center',
            padding: '14px 16px', borderBottom: i < c.listings.length - 1 ? '1px solid #f0f2f6' : 'none',
          }}>
            <Tag tone={i === 0 ? 'blue' : i === 1 ? 'green' : 'red'} variant="soft">{l.type}</Tag>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1e23', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                {l.price}
              </div>
              <div style={{ fontSize: 11, color: '#7e8186', marginTop: 2 }}>{l.floor} · {l.area} · {l.note}</div>
            </div>
            <BPIcons.ChevronRight size={14} stroke="#b7babe"/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- CTA Banner -----
function CtaBanner({ text, sub, cta, variant = 'primary' }) {
  const bg = variant === 'dark' ? '#1a1e23' : variant === 'purple' ? '#8d63e9' : 'linear-gradient(90deg, #06b281, #18997d)';
  return (
    <div style={{
      background: bg, borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 3 }}>{text}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>{sub}</div>
      </div>
      <button style={{
        background: '#fff', color: variant === 'dark' ? '#1a1e23' : variant === 'purple' ? '#8d63e9' : '#06b281',
        border: 0, borderRadius: 999, padding: '10px 20px', fontSize: 13, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: 6, letterSpacing: '-0.01em',
      }}>
        {cta} <BPIcons.Arrow size={14} strokeWidth={2.2}/>
      </button>
    </div>
  );
}

Object.assign(window, {
  CompareHeader, PricePart, SpecsPart, ScorePart, ListingsPart, CtaBanner, SectionCard, TabGroup,
});
