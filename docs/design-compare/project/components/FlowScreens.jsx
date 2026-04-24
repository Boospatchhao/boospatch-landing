// Flow screens for v2:
// Screen 1: 검색 + 단지 선택
// Screen 2: 상세 (시세 + 스펙)
// Screen 3: 커플링 비교 (지도 + 리스트)
// Screen 4: 비교 결과 (최대 5개)

// ───────── Screen 1: Search + pick ─────────
function SearchScreen({ onPick }) {
  const [q, setQ] = React.useState('남산');
  const filtered = q ? SEARCH_RESULTS.filter((r) => r.name.includes(q) || r.address.includes(q)) : SEARCH_RESULTS;
  return (
    <div style={{ padding: '40px 40px 100px', maxWidth: 820, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#06b281', letterSpacing: '0.06em', marginBottom: 8 }}>STEP 1 · 단지 선택</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>비교할 단지를 검색하세요</h1>
        <p style={{ fontSize: 14, color: '#63666c' }}>단지명 또는 주소로 검색할 수 있습니다</p>
      </div>
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="단지명 검색"
        style={{ width: '100%', padding: '18px 20px 18px 52px', border: '2px solid #06b281',
          borderRadius: 14, fontSize: 16, fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box', fontWeight: 500 }} />
        <span style={{ position: 'absolute', left: 18, top: 18, color: '#06b281' }}><BPIcons.Search size={20} /></span>
      </div>
      <div style={{ fontSize: 12, color: '#9a9da2', marginBottom: 10 }}>검색 결과 {filtered.length}건</div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e4e6ea', overflow: 'hidden' }}>
        {filtered.map((r, i) =>
        <button key={r.id} onClick={() => r.key && onPick(r.key)} disabled={!r.key} style={{
          width: '100%', padding: '16px 20px', border: 0, background: 'transparent', cursor: r.key ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', fontFamily: 'var(--font-sans)',
          borderTop: i > 0 ? '1px solid #f0f2f6' : 0, opacity: r.key ? 1 : 0.5
        }} onMouseEnter={(e) => r.key && (e.currentTarget.style.background = '#f8f9fc')} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e7f8f4', color: '#06b281',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>{r.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#7e8186', marginTop: 2 }}>{r.address} · {r.built}년식 · {r.hh.toLocaleString()}세대</div>
            </div>
            {r.key ? <BPIcons.ChevronRight size={18} stroke="#06b281" /> :
          <span style={{ fontSize: 11, color: '#9a9da2' }}>준비중</span>}
          </button>
        )}
      </div>
    </div>);

}

// ───────── Screen 2: Detail ─────────
function DetailScreen({ complex, onCouple, onBack }) {
  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #e4e6ea', padding: '18px 40px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#63666c', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
            <BPIcons.ChevronLeft size={16} /> 다시 검색
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#9a9da2' }}>STEP 2 · 단지 상세</span>
        </div>
      </div>

      <div style={{ padding: '28px 40px 120px', maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title card */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e4e6ea', padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: complex.color + '1a', color: complex.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 }}>{complex.name[0]}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>{complex.name}</h1>
            <div style={{ fontSize: 13, color: '#7e8186', marginBottom: 8 }}>{complex.address}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Tag tone="green" variant="soft">{complex.built}년식 · {new Date().getFullYear() - complex.built}년차</Tag>
              <Tag tone="dark" variant="soft">{complex.households.toLocaleString()}세대</Tag>
              <Tag tone="blue" variant="soft">{complex.transit.line}호선 {complex.transit.station} {complex.transit.distance}</Tag>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#9a9da2' }}>최근 실거래가 · {complex.priceDate}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1a1e23', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{complex.currentPrice}</div>
            <div style={{ fontSize: 12, color: complex.priceDelta > 0 ? '#06b281' : '#ec432c', fontWeight: 700 }}>
              {complex.priceDelta > 0 ? '▲' : '▼'} {Math.abs(complex.priceDelta)}% · 1년 변동
            </div>
          </div>
        </div>

        {/* Price chart */}
        <SectionCard title="시세 추이" subtitle={`최근 5년간 ${Math.max(...complex.priceSeries).toFixed(1)}억에서 ${Math.min(...complex.priceSeries).toFixed(1)}억으로 변동했어요`}>
          <PriceLineChart a={complex} />
          <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(180deg, #ec432c 0%, #ec432c33 100%)' }} />
              <span style={{ color: '#63666c' }}>평균가 이상</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(180deg, #06b28133 0%, #06b281 100%)' }} />
              <span style={{ color: '#63666c' }}>평균가 이하</span>
            </span>
          </div>
        </SectionCard>

        {/* Spec + price detail split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <SectionCard title="단지 상세">
            <SpecTable rows={[
            ['입주년도', `${complex.builtMonth}.01 (${new Date().getFullYear() - complex.built}년차)`],
            ['총세대수', `${complex.households.toLocaleString()}세대`],
            ['건설사', complex.builder],
            ['저/최고층', complex.lowHigh],
            ['현관구조', complex.structure],
            ['세대당 주차', `${complex.parking}대`],
            ['용적률 / 건폐율', `${complex.floorAreaRatio}% / ${complex.buildingRatio}%`]]
            } />
          </SectionCard>

          <SectionCard title="시세 상세">
            <SpecTable rows={[
            ['최근 실거래가', <strong style={{ color: '#1a1e23', fontSize: 14 }}>{complex.currentPrice}</strong>],
            ['실거래 정보', `${complex.priceDate} · ${complex.priceInfo}`],
            ['1년 변동률', <span style={{ color: complex.priceDelta > 0 ? '#06b281' : '#ec432c', fontWeight: 700 }}>{complex.priceDelta > 0 ? '+' : ''}{complex.priceDelta}%</span>],
            ['전세가', complex.rent],
            ['전세가율', `${complex.rentRatio}%`],
            ['최근 3년 매매', `${complex.saleCount3y}건`],
            ['전세 / 월세', `${complex.jeonseCount3y}건 / ${complex.monthlyCount3y}건`]]
            } />
          </SectionCard>
        </div>

        {/* Coupling CTA */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1e23 0%, #31353a 100%)', borderRadius: 16,
          padding: '28px 32px', color: '#fff', display: 'flex', alignItems: 'center', gap: 24
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#06b281', letterSpacing: '0.05em', marginBottom: 6 }}>COUPLING COMPARE</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
              {complex.name}과 움직이는 단지들, 궁금하지 않으세요?
            </h2>
            <div style={{ fontSize: 13, color: '#b7babe' }}>시세 흐름이 비슷한 단지를 지도에서 확인하고, 최대 5개까지 한 번에 비교하세요</div>
          </div>
          <button onClick={onCouple} style={{
            background: '#06b281', color: '#fff', border: 0, borderRadius: 999,
            padding: '14px 26px', fontSize: 14, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', gap: 8
          }}>커플링 단지 비교하기 <BPIcons.Arrow size={16} strokeWidth={2.2} /></button>
        </div>
      </div>
    </div>);

}

function SpecTable({ rows }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 0 }}>
      {rows.map(([k, v], i) =>
      <React.Fragment key={i}>
          <div style={{ padding: '12px 0', borderBottom: i < rows.length - 1 ? '1px solid #f0f2f6' : 0,
          fontSize: 12, color: '#7e8186' }}>{k}</div>
          <div style={{ padding: '12px 0', borderBottom: i < rows.length - 1 ? '1px solid #f0f2f6' : 0,
          fontSize: 13, color: '#31353a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
        </React.Fragment>
      )}
    </div>);

}

// ───────── Screen 3: Coupling (map + list + inline chart + table) ─────────
function CouplingScreen({ primary, selected, onToggle, onBack, filter, onFilter }) {
  const byId = Object.values(COMPLEXES).reduce((m, c) => (m[c.id] = c, m), {});
  const others = RIVAL_ORDER.filter((k) => k !== primary.id && COMPLEXES[k].sim).map((k) => COMPLEXES[k]);

  const sortKey = filter === 'all' ? 'overall' : filter === 'price' ? 'price' : filter === 'size' ? 'size' : 'age';
  const sorted = [...others].sort((a, b) => (b.sim[sortKey] || 0) - (a.sim[sortKey] || 0));

  const selectedComplexes = (selected || []).map((k) => COMPLEXES[k] || byId[k]).filter(Boolean);
  const all = [primary, ...selectedComplexes];

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #e4e6ea', padding: '18px 40px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#63666c',
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
            <BPIcons.ChevronLeft size={16} /> {primary.name} 상세로
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#9a9da2' }}>커플링 비교 · 단지 선택 시 아래에서 실시간 비교 (최대 5개)</span>
        </div>
      </div>

      <div style={{ padding: '24px 40px 60px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {primary.name}과 비교 가능성 높은 단지들
          </h2>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 13 }}>
            <span style={{ color: '#06b281', fontSize: 16, fontWeight: 800 }}>{selectedComplexes.length}</span>
            <span style={{ color: '#9a9da2' }}> / 5 선택됨</span>
          </div>
          {selectedComplexes.length > 0 &&
          <button onClick={() => onToggle('__reset')} style={{
            background: 'transparent', border: 0, color: '#7e8186', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
              <BPIcons.Refresh size={12} /> 초기화
            </button>
          }
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
          {/* Map side */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e4e6ea', padding: 12 }}>
            <FakeNaverMap primary={primary} rivals={sorted} selected={selected} onToggle={onToggle} />
          </div>

          {/* List side */}
          <div>
            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['all', '전체'], ['price', '상승흐름유사'], ['size', '세대수 유사'], ['age', '연식 유사']].map(([k, l]) =>
              <button key={k} onClick={() => onFilter(k)} style={{
                padding: '9px 16px', borderRadius: 8, border: filter === k ? '1.5px solid #06b281' : '1px solid #e4e6ea',
                background: filter === k ? '#e7f8f4' : '#fff', color: filter === k ? '#06b281' : '#31353a',
                fontSize: 13, fontWeight: filter === k ? 700 : 500, cursor: 'pointer', fontFamily: 'var(--font-sans)'
              }}>{l}</button>
              )}
              <button style={{ width: 36, height: 36, borderRadius: 999, border: '1px solid #e4e6ea', background: '#fff',
                color: '#9a9da2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
              title="유사도 기준 안내">?</button>
            </div>

            {/* Primary (pinned) */}
            <div style={{ marginBottom: 8, padding: '14px 16px', background: '#e7f0fc', borderRadius: 10,
              border: '1.5px solid #0b66e4', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#0b66e4', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>📍</div>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0b66e4', flex: 1 }}>{primary.name}</span>
              <span style={{ fontSize: 11, color: '#0b66e4', fontWeight: 700 }}>기준 단지</span>
            </div>

            {/* Rival list */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e6ea', maxHeight: 420, overflowY: 'auto' }}>
              {sorted.map((r, i) => {
                const checked = selected.includes(r.id);
                const maxed = !checked && selectedComplexes.length >= 5;
                return (
                  <label key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    borderTop: i > 0 ? '1px solid #f0f2f6' : 0,
                    cursor: maxed ? 'not-allowed' : 'pointer',
                    background: checked ? '#f8fffb' : 'transparent',
                    opacity: maxed ? 0.45 : 1
                  }}>
                    <Checkbox checked={checked} onChange={() => !maxed && onToggle(r.id)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: '#9a9da2', marginTop: 2 }}>
                        {r.built}년식 · {r.households.toLocaleString()}세대 · 유사도 <strong style={{ color: '#8d63e9' }}>{(r.sim[sortKey] * 100).toFixed(0)}%</strong>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#9a9da2', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{i + 2}</span>
                  </label>);

              })}
            </div>
          </div>
        </div>

        {/* Inline live-updating comparison */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selectedComplexes.length === 0 ?
          <div style={{ padding: '48px 20px', textAlign: 'center', background: '#fff', borderRadius: 14, border: '1px dashed #d9dde4' }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.6 }}>📊</div>
              <div style={{ fontSize: 14, color: '#7e8186', fontWeight: 600 }}>지도나 리스트에서 단지를 선택하면 이곳에 시세 차트와 비교표가 나타납니다</div>
              <div style={{ fontSize: 12, color: '#9a9da2', marginTop: 4 }}>최대 5개까지 선택할 수 있어요</div>
            </div> :

          <React.Fragment>
              <SectionCard title="시세 추이 비교" subtitle={`${all.length}개 단지 · 최근 3년 매매가 흐름`}
            actions={
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
                    {all.map((c, i) =>
              <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                        <span style={{ color: '#31353a', fontWeight: i === 0 ? 800 : 500 }}>{c.name}{i === 0 && ' · 기준'}</span>
                      </span>
              )}
                  </div>
            }>
                <MultiLineChart complexes={all} />
              </SectionCard>

              <SectionCard title="인근단지 상세 비교표" subtitle="기준단지(1번) + 선택 단지"
            actions={
            <Button variant="outline" size="sm">
                    <BPIcons.Excel size={13} stroke="#06b281" /> 엑셀 다운로드
                  </Button>
            }>
                <CompareTable complexes={all} />
              </SectionCard>
            </React.Fragment>
          }
        </div>
      </div>
    </div>);

}

// Fake Naver map with pins
function FakeNaverMap({ primary, rivals, selected, onToggle }) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1/0.78', borderRadius: 10, overflow: 'hidden',
      background: '#eaf3ed' }}>
      {/* Map base (stylized Naver-ish) */}
      <svg viewBox="0 0 400 310" width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d9e6dd" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="310" fill="#eaf3ed" />
        <rect width="400" height="310" fill="url(#grid)" />

        {/* Han river */}
        <path d="M 0 210 Q 100 200 200 215 T 400 220 L 400 310 L 0 310 Z" fill="#cfdcf4" />
        <text x="200" y="250" fontSize="11" fill="#5b7aa8" fontWeight="700">한강</text>

        {/* Roads */}
        <path d="M 0 120 L 400 140" stroke="#fff" strokeWidth="4" />
        <path d="M 180 0 L 200 310" stroke="#fff" strokeWidth="3" />
        <path d="M 0 80 Q 200 90 400 70" stroke="#fff" strokeWidth="2.5" />

        {/* Subway lines */}
        <path d="M 30 100 L 370 110" stroke="#df7512" strokeWidth="2.5" fill="none" />
        <path d="M 60 40 L 80 280" stroke="#f39c12" strokeWidth="2" fill="none" />

        {/* Subway stations */}
        {[['버티고개', 180, 110], ['약수', 140, 108], ['금호', 230, 115], ['옥수', 290, 165], ['응봉', 260, 145]].map(([n, x, y]) =>
        <g key={n}>
            <circle cx={x} cy={y} r="5" fill="#fff" stroke="#df7512" strokeWidth="1.5" />
            <text x={x} y={y + 16} textAnchor="middle" fontSize="8" fill="#31353a" fontWeight="700">{n}</text>
          </g>
        )}

        {/* Place labels */}
        <text x="80" y="40" fontSize="9" fill="#7e8186">중구</text>
        <text x="330" y="40" fontSize="9" fill="#7e8186">성동구</text>
      </svg>

      {/* Primary pin */}
      <Pin primary rival={primary} x={primary.mapPos.x} y={primary.mapPos.y} />

      {/* Rival pins */}
      {rivals.map((r, i) =>
      <Pin key={r.id} rival={r} x={r.mapPos.x} y={r.mapPos.y} index={i + 2}
      selected={selected.includes(r.id)} onClick={() => onToggle(r.id)} />
      )}

      {/* Scale */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, background: '#fff', padding: '3px 8px',
        borderRadius: 4, fontSize: 10, color: '#63666c', border: '1px solid #e4e6ea' }}>1000m</div>
      <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 9, color: '#9a9da2',
        background: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: 3 }}>© NAVER Corp</div>
    </div>);

}

function Pin({ rival, primary, x, y, index, selected, onClick }) {
  const bg = primary ? '#0b66e4' : selected ? rival.color : '#fff';
  const fg = primary || selected ? '#fff' : '#31353a';
  const border = primary ? '#0b66e4' : selected ? rival.color : '#d9e6dd';
  return (
    <button onClick={onClick} style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)',
      background: bg, color: fg, border: `1.5px solid ${border}`, borderRadius: 14,
      padding: '5px 10px 6px', fontSize: 11, fontWeight: 800, cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)',
      boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.12)',
      zIndex: selected ? 5 : 2, letterSpacing: '-0.01em'
    }}>
      {primary && '📍 '}{rival.name}
      {index && !selected && <span style={{ marginLeft: 4, opacity: 0.6, fontWeight: 600 }}>#{index}</span>}
      {selected && <span style={{ marginLeft: 4 }}>✓</span>}
    </button>);

}

// ───────── UNIFIED: search + detail + coupling on one scrollable page ─────────
function UnifiedScreen({ primaryKey, onPrimaryKey, selected, onToggle, filter, onFilter }) {
  const primary = COMPLEXES[primaryKey];
  const byId = Object.values(COMPLEXES).reduce((m, c) => (m[c.id] = c, m), {});
  const others = RIVAL_ORDER.filter((k) => k !== primary.id && COMPLEXES[k].sim).map((k) => COMPLEXES[k]);
  const sortKey = filter === 'all' ? 'overall' : filter === 'price' ? 'price' : filter === 'size' ? 'size' : 'age';
  const sorted = [...others].sort((a, b) => (b.sim[sortKey] || 0) - (a.sim[sortKey] || 0));
  const selectedComplexes = (selected || []).map((k) => COMPLEXES[k] || byId[k]).filter(Boolean);
  const all = [primary, ...selectedComplexes];

  // Search state
  const [q, setQ] = React.useState('');
  const [openSearch, setOpenSearch] = React.useState(false);
  const searchResults = q ?
  SEARCH_RESULTS.filter((r) => r.key && (r.name.includes(q) || r.address.includes(q))) :
  SEARCH_RESULTS.filter((r) => r.key);

  return (
    <div>
      {/* Sticky search + primary summary bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e4e6ea', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 40px',
          display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Search bar */}
          <div style={{ flex: 1, maxWidth: 520, position: 'relative' }}>
            <input value={q} onChange={(e) => {setQ(e.target.value);setOpenSearch(true);}}
            onFocus={() => setOpenSearch(true)}
            onBlur={() => setTimeout(() => setOpenSearch(false), 180)}
            placeholder={`기준 단지 검색 — 현재: ${primary.name}`}
            style={{ width: '100%', padding: '12px 16px 12px 42px', border: '1px solid #e4e6ea',
              borderRadius: 10, fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
              boxSizing: 'border-box', fontWeight: 500, background: '#f8f9fc' }} />
            <span style={{ position: 'absolute', left: 14, top: 12, color: '#9a9da2' }}><BPIcons.Search size={16} /></span>
            {openSearch && searchResults.length > 0 &&
            <div style={{ position: 'absolute', top: 44, left: 0, right: 0, background: '#fff',
              border: '1px solid #e4e6ea', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              maxHeight: 320, overflowY: 'auto', zIndex: 40 }}>
                {searchResults.map((r, i) =>
              <button key={r.id} onMouseDown={() => {onPrimaryKey(r.key);setQ('');setOpenSearch(false);}} style={{
                width: '100%', padding: '12px 16px', border: 0, background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: 'var(--font-sans)',
                borderTop: i > 0 ? '1px solid #f0f2f6' : 0
              }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: '#7e8186', marginTop: 1 }}>{r.address}</div>
                    </div>
                  </button>
              )}
              </div>
            }
          </div>

          <div style={{ flex: 1 }} />

          {/* Selection count */}
          <div style={{ fontSize: 13 }}>
            <span style={{ color: '#06b281', fontSize: 17, fontWeight: 800 }}>{selectedComplexes.length}</span>
            <span style={{ color: '#9a9da2' }}> / 5 비교 단지</span>
          </div>
          {selectedComplexes.length > 0 &&
          <button onClick={() => onToggle('__reset')} style={{
            background: 'transparent', border: 0, color: '#7e8186', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
              <BPIcons.Refresh size={12} /> 초기화
            </button>
          }
        </div>
      </div>

      <div style={{ padding: '24px 40px 80px', maxWidth: 1400, margin: '0 auto',
        display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Hero: primary summary */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e4e6ea', padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{primary.name}</h1>
              <span style={{ fontSize: 13, color: '#7e8186' }}>{primary.address}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <Tag tone="green" variant="soft">{primary.built}년식 · {new Date().getFullYear() - primary.built}년차</Tag>
              <Tag tone="dark" variant="soft">{primary.households.toLocaleString()}세대</Tag>
              <Tag tone="blue" variant="soft">{primary.transit.line}호선 {primary.transit.station} {primary.transit.distance}</Tag>
              <Tag tone="dark" variant="soft">용적률 {primary.floorAreaRatio}%</Tag>
              <Tag tone="dark" variant="soft">주차 세대당 {primary.parking}대</Tag>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: '#9a9da2', fontWeight: 700, letterSpacing: '0.06em' }}>최근 실거래가</div>
                <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {primary.currentPrice}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9a9da2', fontWeight: 700, letterSpacing: '0.06em' }}>1년 변동</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: primary.priceDelta > 0 ? '#06b281' : '#ec432c', fontVariantNumeric: 'tabular-nums' }}>
                  {primary.priceDelta > 0 ? '▲' : '▼'} {Math.abs(primary.priceDelta)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9a9da2', fontWeight: 700, letterSpacing: '0.06em' }}>전세가</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{primary.rent}</div>
              </div>
            </div>
          </div>
          {/* Mini trend chart */}
          <div style={{ width: 360, height: 160 }}>
            <PriceLineChart a={primary} width={360} height={160} />
          </div>
        </div>

        {/* Map + list */}
        <SectionCard title={`${primary.name}과 비교 가능성 높은 단지들`}
        subtitle="지도나 리스트에서 단지를 선택하면 아래 비교 섹션이 실시간으로 업데이트됩니다">
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
            {/* Map */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f2f6', padding: 8 }}>
              <FakeNaverMap primary={primary} rivals={sorted} selected={selected} onToggle={onToggle} />
            </div>

            {/* List */}
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[['all', '전체'], ['price', '상승흐름유사'], ['size', '세대수 유사'], ['age', '연식 유사']].map(([k, l]) =>
                <button key={k} onClick={() => onFilter(k)} style={{
                  padding: '9px 16px', borderRadius: 8, border: filter === k ? '1.5px solid #06b281' : '1px solid #e4e6ea',
                  background: filter === k ? '#e7f8f4' : '#fff', color: filter === k ? '#06b281' : '#31353a',
                  fontSize: 13, fontWeight: filter === k ? 700 : 500, cursor: 'pointer', fontFamily: 'var(--font-sans)'
                }}>{l}</button>
                )}
              </div>

              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e6ea', maxHeight: 380, overflowY: 'auto' }}>
                {sorted.map((r, i) => {
                  const checked = selected.includes(r.id);
                  const maxed = !checked && selectedComplexes.length >= 5;
                  return (
                    <label key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      borderTop: i > 0 ? '1px solid #f0f2f6' : 0,
                      cursor: maxed ? 'not-allowed' : 'pointer',
                      background: checked ? '#f8fffb' : 'transparent',
                      opacity: maxed ? 0.45 : 1
                    }}>
                      <Checkbox checked={checked} onChange={() => !maxed && onToggle(r.id)} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#9a9da2', marginTop: 2 }}>
                          {r.built}년식 · {r.households.toLocaleString()}세대 · 유사도 <strong style={{ color: '#8d63e9' }}>{(r.sim[sortKey] * 100).toFixed(0)}%</strong>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#9a9da2', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{i + 2}</span>
                    </label>);

                })}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Inline comparison */}
        {selectedComplexes.length === 0 ?
        <div style={{ padding: '48px 20px', textAlign: 'center', background: '#fff', borderRadius: 14, border: '1px dashed #d9dde4' }}>
            <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.6 }}>📊</div>
            <div style={{ fontSize: 14, color: '#7e8186', fontWeight: 600 }}>단지를 선택하면 시세 차트와 비교표가 나타납니다</div>
            <div style={{ fontSize: 12, color: '#9a9da2', marginTop: 4 }}>최대 5개까지 선택할 수 있어요</div>
          </div> :

        <React.Fragment>
            <SectionCard title="시세 추이 비교" subtitle={`${all.length}개 단지 · 최근 3년 매매가 흐름`}
          actions={
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
                  {all.map((c, i) =>
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                      <span style={{ color: '#31353a', fontWeight: i === 0 ? 800 : 500 }}>{c.name}{i === 0 && ' · 기준'}</span>
                    </span>
            )}
                </div>
          }>
              <MultiLineChart complexes={all} />
            </SectionCard>

            <SectionCard title="인근단지 상세 비교표" subtitle="기준단지(1번) + 선택 단지"
          actions={
          <Button variant="outline" size="sm">
                  <BPIcons.Excel size={13} stroke="#06b281" /> 엑셀 다운로드
                </Button>
          }>
              <CompareTable complexes={all} />
            </SectionCard>
          </React.Fragment>
        }
      </div>
    </div>);

}

// ───────── Screen 4: Compare Result (primary + up to 5) ─────────
function MultiCompareScreen({ primary, selected, onBack, onChangeSelection }) {
  const byId = Object.values(COMPLEXES).reduce((m, c) => (m[c.id] = c, m), {});
  const validSelected = (selected || []).map((k) => COMPLEXES[k] || byId[k]).filter(Boolean);

  if (validSelected.length === 0) {
    return (
      <div>
        <div style={{ background: '#fff', borderBottom: '1px solid #e4e6ea', padding: '18px 40px', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={onBack} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#63666c',
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
              <BPIcons.ChevronLeft size={16} /> 단지 선택으로
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>인근단지 상세 비교표</h2>
          </div>
        </div>
        <div style={{ padding: '120px 40px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏘️</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10 }}>비교할 단지를 먼저 선택해주세요</h3>
          <p style={{ fontSize: 14, color: '#7e8186', marginBottom: 24, lineHeight: 1.6 }}>
            커플링 비교 화면에서 {primary.name}과 비교하고 싶은 단지를<br />최대 5개까지 선택하면 상세 비교표가 생성됩니다.
          </p>
          <Button variant="primary" size="lg" onClick={onChangeSelection}>
            커플링 단지 선택하러 가기 <BPIcons.Arrow size={14} strokeWidth={2.2} />
          </Button>
        </div>
      </div>);

  }

  const all = [primary, ...validSelected];
  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #e4e6ea', padding: '18px 40px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#63666c',
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
            <BPIcons.ChevronLeft size={16} /> 단지 선택 수정
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>인근단지 상세 비교표</h2>
          <div style={{ flex: 1 }} />
          <Button variant="outline" size="sm" onClick={onChangeSelection}>
            <BPIcons.Edit size={13} /> 비교 단지 추가/변경
          </Button>
          <Button variant="outline" size="sm">
            <BPIcons.Excel size={13} stroke="#06b281" /> 엑셀 다운로드
          </Button>
        </div>
      </div>

      <div style={{ padding: '24px 40px 120px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Price chart with all lines */}
        <SectionCard title="시세 추이 비교" subtitle={`${all.length}개 단지 매매가 흐름 · 최근 3년`}>
          <MultiLineChart complexes={all} />
          <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap', fontSize: 12 }}>
            {all.map((c) => <LegendItem key={c.id} color={c.color} label={c.name} />)}
          </div>
        </SectionCard>

        {/* Comparison table */}
        <SectionCard title="인근단지 상세 비교표" subtitle="기준단지(1번) + 선택 단지">
          <CompareTable complexes={all} />
        </SectionCard>
      </div>
    </div>);

}

function MultiLineChart({ complexes, width = 1200, height = 300 }) {
  const p = { t: 20, r: 80, b: 36, l: 20 };
  const innerW = width - p.l - p.r,innerH = height - p.t - p.b;
  const allPts = complexes.flatMap((c) => c.priceSeries);
  const min = Math.min(...allPts) * 0.92;
  const max = Math.max(...allPts) * 1.05;
  const N = complexes[0].priceSeries.length;
  const xFor = (i) => p.l + innerW * i / (N - 1);
  const yFor = (v) => p.t + innerH * (1 - (v - min) / (max - min || 1));
  const pathFor = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(v)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ display: 'block' }}>
      {/* baseline */}
      <line x1={p.l} x2={width - p.r} y1={p.t + innerH} y2={p.t + innerH} stroke="#e4e6ea" />

      {/* Non-primary lines */}
      {complexes.slice(1).map((c) =>
      <path key={c.id} d={pathFor(c.priceSeries)} fill="none" stroke={c.color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
      )}
      {/* Primary on top, thicker */}
      {complexes.slice(0, 1).map((c) =>
      <g key={c.id}>
          <path d={pathFor(c.priceSeries)} fill="none" stroke={c.color} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={xFor(N - 1)} cy={yFor(c.priceSeries[N - 1])} r="5" fill={c.color} />
          <circle cx={xFor(N - 1)} cy={yFor(c.priceSeries[N - 1])} r="8" fill={c.color} opacity="0.25" />
        </g>
      )}
      {/* End-dot price labels */}
      {complexes.map((c) =>
      <text key={`lbl-${c.id}`} x={xFor(N - 1) + 10} y={yFor(c.priceSeries[N - 1]) + 4}
      fontSize="11" fontWeight="700" fill={c.color}
      style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>
          {c.priceSeries[N - 1].toFixed(1)}억
        </text>
      )}

      {/* x labels */}
      {['2023', '2024', '2025', '2026'].map((l, i, a) =>
      <text key={l} x={p.l + innerW * i / (a.length - 1)} y={height - 10}
      textAnchor="middle" fontSize="11" fill="#7e8186"
      style={{ fontFamily: 'var(--font-sans)' }}>{l}년</text>
      )}
    </svg>);

}

function CompareTable({ complexes }) {
  const rows = [
  ['최근 실거래가', (c) => <div><div style={{ fontSize: 18, fontWeight: 900, color: '#1a1e23', letterSpacing: '-0.02em' }}>{c.currentPrice}</div><div style={{ fontSize: 11, color: '#7e8186', marginTop: 2 }}>({c.priceDate}/{c.priceInfo})</div></div>],
  ['최근 3년 거래건수', (c) => <div><div style={{ fontSize: 13, fontWeight: 600 }}>매매 {c.saleCount3y}건</div><div style={{ fontSize: 11, color: '#7e8186', marginTop: 4 }}>전세 {c.jeonseCount3y}건 · 월세 {c.monthlyCount3y}건</div></div>],
  ['전세가율', (c) => <span style={{ fontWeight: 700 }}>{c.rentRatio}%</span>],
  ['분양 경쟁률', () => '-'],
  ['평당 분양가', () => '-'],
  ['입주년도', (c) => `${c.builtMonth}.01 (${new Date().getFullYear() - c.built}년차)`],
  ['총세대수', (c) => `${c.households.toLocaleString()}세대`],
  ['건설사', (c) => c.builder],
  ['저/최고층', (c) => c.lowHigh],
  ['현관구조', (c) => c.structure],
  ['교통환경 (인근역과의 거리)', (c) =>
  <div>
        <Tag tone={c.transit.line === '3' ? 'dark' : c.transit.line === '6' ? 'dark' : 'green'} variant="soft">{c.transit.line}{isNaN(+c.transit.line) ? '' : '호선'}</Tag>
        <div style={{ fontSize: 12, marginTop: 6 }}>{c.transit.station} - {c.transit.distance}</div>
      </div>],

  ['주차대수', (c) => `${(c.households * c.parking).toFixed(0)}대 (세대당 ${c.parking}대)`]];


  const cellW = `${100 / (complexes.length + 1)}%`;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${complexes.length}, 1fr)`, minWidth: 900, borderTop: '1px solid #e4e6ea' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e4e6ea', background: '#f8f9fc', fontSize: 12, fontWeight: 700, color: '#7e8186' }}>구분</div>
        {complexes.map((c, i) =>
        <div key={c.id} style={{
          padding: '16px', borderBottom: i === 0 ? '2px solid #8d63e9' : '1px solid #e4e6ea',
          borderLeft: '1px solid #e4e6ea', borderTop: i === 0 ? '2px solid #8d63e9' : 0,
          borderRight: i === 0 ? '2px solid #8d63e9' : 0,
          background: i === 0 ? '#f3eefc' : '#f8f9fc'
        }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: 4, background: i === 0 ? '#8d63e9' : '#9a9da2',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.name}</span>
            </div>
          </div>
        )}
        {/* Rows */}
        {rows.map(([label, render], ri) =>
        <React.Fragment key={ri}>
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f2f6', fontSize: 12, color: '#63666c', lineHeight: 1.4 }}>{label}</div>
            {complexes.map((c, ci) =>
          <div key={c.id} style={{
            padding: '16px', borderBottom: '1px solid #f0f2f6', borderLeft: '1px solid #f0f2f6',
            borderRight: ci === 0 ? '2px solid #8d63e9' : 0,
            background: ci === 0 ? '#faf7ff' : '#fff',
            fontSize: 13, color: '#31353a', fontVariantNumeric: 'tabular-nums'
          }}>{render(c)}</div>
          )}
          </React.Fragment>
        )}
      </div>
    </div>);

}

Object.assign(window, {
  SearchScreen, DetailScreen, CouplingScreen, MultiCompareScreen
});