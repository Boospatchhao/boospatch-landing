// Today's Fight widget, search modal, history panel, weight modal, share card

function FightWidget({ pair, onVote, voted, onOpenCompare, theme = 'A' }) {
  const a = COMPLEXES[pair.a], b = COMPLEXES[pair.b];
  const total = pair.votesA + pair.votesB;
  const pctA = Math.round((pair.votesA / total) * 100);
  const pctB = 100 - pctA;

  if (theme === 'A') return <FightThemeVs pair={pair} a={a} b={b} total={total} pctA={pctA} pctB={pctB} voted={voted} onVote={onVote} onOpenCompare={onOpenCompare}/>;
  if (theme === 'B') return <FightThemeClean pair={pair} a={a} b={b} total={total} pctA={pctA} pctB={pctB} voted={voted} onVote={onVote} onOpenCompare={onOpenCompare}/>;
  return <FightThemeNews pair={pair} a={a} b={b} total={total} pctA={pctA} pctB={pctB} voted={voted} onVote={onVote} onOpenCompare={onOpenCompare}/>;
}

function FightThemeVs({ pair, a, b, total, pctA, pctB, voted, onVote, onOpenCompare }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1e23 0%, #31353a 100%)', borderRadius: 16,
      padding: '22px 26px', color: '#fff', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#06b281', background: 'rgba(6,178,129,0.18)', padding: '3px 8px', borderRadius: 4, letterSpacing: '0.03em' }}>TODAY'S FIGHT</span>
        <span style={{ fontSize: 12, color: '#b7babe' }}>{pair.title}</span>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11, color: '#9a9da2' }}>투표 {total.toLocaleString()}명 참여</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <FightCard c={a} pct={voted ? pctA : null} selected={voted === 'a'} onClick={() => !voted && onVote('a')} disabled={!!voted} dark/>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#06b281', textAlign: 'center', letterSpacing: '-0.04em' }}>VS</div>
        <FightCard c={b} pct={voted ? pctB : null} selected={voted === 'b'} onClick={() => !voted && onVote('b')} disabled={!!voted} dark/>
      </div>

      {voted ? (
        <button onClick={onOpenCompare} style={{
          width: '100%', padding: '12px', background: '#06b281', color: '#fff', border: 0, borderRadius: 10,
          fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, letterSpacing: '-0.01em',
        }}>
          당신이 고른 {voted === 'a' ? a.name : b.name}의 진짜 강점은? <BPIcons.Arrow size={14} strokeWidth={2.2}/>
        </button>
      ) : (
        <div style={{ fontSize: 11, color: '#7e8186', textAlign: 'center', lineHeight: 1.5 }}>
          ※ 본 투표는 사용자 주관적 선호도 조사이며, 단지의 실제 가치·시세·품질과 무관합니다.
        </div>
      )}
    </div>
  );
}

function FightCard({ c, pct, selected, onClick, disabled, dark }) {
  const showBar = pct !== null;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      position: 'relative', padding: '16px 18px', borderRadius: 12, overflow: 'hidden',
      background: dark ? (selected ? c.color + '33' : '#31353a') : '#fff',
      border: `1.5px solid ${selected ? c.color : (dark ? 'rgba(255,255,255,0.08)' : '#e4e6ea')}`,
      color: dark ? '#fff' : '#1a1e23', cursor: disabled ? 'default' : 'pointer',
      textAlign: 'left', fontFamily: 'var(--font-sans)', transition: 'all 180ms',
    }}>
      {showBar && (
        <div style={{
          position: 'absolute', left: 0, bottom: 0, height: 4, width: `${pct}%`,
          background: c.color, transition: 'width 500ms cubic-bezier(0.16,1,0.3,1)',
        }}/>
      )}
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>{c.name}</div>
      <div style={{ fontSize: 11, color: dark ? '#9a9da2' : '#7e8186' }}>{c.address}</div>
      {showBar && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: c.color, letterSpacing: '-0.03em' }}>{pct}%</span>
          {selected && <span style={{ fontSize: 10, fontWeight: 700, color: c.color }}>✓ 내 선택</span>}
        </div>
      )}
    </button>
  );
}

function FightThemeClean({ pair, a, b, total, pctA, pctB, voted, onVote, onOpenCompare }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e4e6ea', padding: '22px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Tag tone="green" variant="soft">오늘의 Fight</Tag>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{pair.title}</span>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11, color: '#9a9da2' }}>{total.toLocaleString()}명 참여</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FightCard c={a} pct={voted ? pctA : null} selected={voted === 'a'} onClick={() => !voted && onVote('a')} disabled={!!voted}/>
        <FightCard c={b} pct={voted ? pctB : null} selected={voted === 'b'} onClick={() => !voted && onVote('b')} disabled={!!voted}/>
      </div>
      {voted && (
        <button onClick={onOpenCompare} style={{
          marginTop: 14, width: '100%', padding: '11px', background: '#1a1e23', color: '#fff', border: 0, borderRadius: 8,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>선택한 단지 자세히 비교하기 <BPIcons.Arrow size={14} strokeWidth={2.2}/></button>
      )}
    </div>
  );
}

function FightThemeNews({ pair, a, b, total, pctA, pctB, voted, onVote, onOpenCompare }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #e7f8f4 0%, #f8f5ff 100%)',
      borderRadius: 16, border: '1px solid #e4e6ea', padding: '22px 26px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#494d52', letterSpacing: '0.08em', marginBottom: 6 }}>
        📰 오늘의 FIGHT · 2026년 4월 24일
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 14 }}>
        "{pair.title}, 당신의 선택은?"
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FightCard c={a} pct={voted ? pctA : null} selected={voted === 'a'} onClick={() => !voted && onVote('a')} disabled={!!voted}/>
        <FightCard c={b} pct={voted ? pctB : null} selected={voted === 'b'} onClick={() => !voted && onVote('b')} disabled={!!voted}/>
      </div>
      <div style={{ fontSize: 11, color: '#7e8186' }}>현재 {total.toLocaleString()}명 참여 · 어제의 승자: <strong>반포자이 68%</strong></div>
      {voted && (
        <button onClick={onOpenCompare} style={{
          marginTop: 14, width: '100%', padding: '11px', background: '#8d63e9', color: '#fff', border: 0, borderRadius: 8,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>결과 상세 분석 보기 →</button>
      )}
    </div>
  );
}

// ----- Weight modal -----
function WeightModal({ open, weights, onChange, onClose }) {
  if (!open) return null;
  const axes = ['traffic', 'school', 'newness', 'environment', 'investment'];
  const sum = axes.reduce((s, k) => s + weights[k], 0);

  const preset = (name) => {
    const presets = {
      '학부모': { traffic: 15, school: 40, newness: 15, environment: 20, investment: 10 },
      '투자자': { traffic: 15, school: 10, newness: 15, environment: 10, investment: 50 },
      '실거주': { traffic: 25, school: 20, newness: 20, environment: 25, investment: 10 },
    };
    onChange(presets[name]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,30,35,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 480, background: '#fff', borderRadius: 16, padding: '24px 28px',
        boxShadow: '0 24px 48px rgba(26,30,35,.16)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>나만의 우선순위 설정</h3>
          <div style={{ flex: 1 }}/>
          <IconButton onClick={onClose}><BPIcons.X size={16}/></IconButton>
        </div>
        <div style={{ fontSize: 12, color: '#7e8186', marginBottom: 18 }}>내 상황에 맞게 가중치를 조절하세요 (합계 {sum}%)</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          {['학부모', '투자자', '실거주'].map((p) => (
            <button key={p} onClick={() => preset(p)} style={{
              flex: 1, padding: '10px', background: '#f8f9fc', border: '1px solid #e4e6ea', borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', color: '#31353a',
            }}>{p}</button>
          ))}
        </div>

        {axes.map((k) => (
          <div key={k} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', marginBottom: 6, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{SCORE_LABELS[k]}</span>
              <div style={{ flex: 1 }}/>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#06b281', fontVariantNumeric: 'tabular-nums' }}>{weights[k]}%</span>
            </div>
            <input type="range" min="0" max="60" value={weights[k]} onChange={(e) => onChange({ ...weights, [k]: +e.target.value })}
              style={{ width: '100%', accentColor: '#06b281' }}/>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={onClose}>적용</Button>
        </div>
      </div>
    </div>
  );
}

// ----- Search modal -----
function SearchModal({ open, slot, onPick, onClose }) {
  const [q, setQ] = React.useState('');
  if (!open) return null;
  const all = Object.values(COMPLEXES);
  const filtered = q ? all.filter((c) => c.name.includes(q) || c.address.includes(q)) : all;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,30,35,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 520, background: '#fff', borderRadius: 16, padding: '20px 22px',
        boxShadow: '0 24px 48px rgba(26,30,35,.16)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>단지 {slot?.toUpperCase()} 선택</h3>
          <div style={{ flex: 1 }}/>
          <IconButton onClick={onClose}><BPIcons.X size={16}/></IconButton>
        </div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="단지명 검색 (예: 반포자이)" style={{
            width: '100%', padding: '12px 14px 12px 38px', border: '1.5px solid #06b281', borderRadius: 10,
            fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
          }}/>
          <span style={{ position: 'absolute', left: 12, top: 12, color: '#06b281' }}><BPIcons.Search size={16}/></span>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {filtered.map((c) => (
            <button key={c.id} onClick={() => onPick(c)} style={{
              width: '100%', padding: '12px 14px', border: 0, background: 'transparent', borderRadius: 8,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              fontFamily: 'var(--font-sans)',
            }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: c.color + '1a', color: c.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{c.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#9a9da2' }}>{c.address} · {c.built}년식 · {c.households}세대</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.currentPrice}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- History panel -----
function HistoryPanel({ open, history, onPick, onClose }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', right: 24, top: 140, width: 320, background: '#fff',
      borderRadius: 14, border: '1px solid #e4e6ea', boxShadow: '0 10px 24px rgba(26,30,35,.08)',
      zIndex: 500, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>최근 비교 히스토리</span>
        <div style={{ flex: 1 }}/>
        <IconButton onClick={onClose} size={24}><BPIcons.X size={14}/></IconButton>
      </div>
      {history.length === 0 ? (
        <div style={{ fontSize: 12, color: '#9a9da2', padding: '20px 8px', textAlign: 'center' }}>아직 비교한 단지가 없어요</div>
      ) : history.map((h, i) => (
        <button key={i} onClick={() => onPick(h)} style={{
          width: '100%', padding: '10px 8px', border: 0, background: 'transparent', borderRadius: 8,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
          fontFamily: 'var(--font-sans)',
        }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontSize: 13, fontWeight: 700, color: COMPLEXES[h.a].color }}>{COMPLEXES[h.a].name}</span>
          <span style={{ fontSize: 11, color: '#b7babe' }}>VS</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: COMPLEXES[h.b].color }}>{COMPLEXES[h.b].name}</span>
          <div style={{ flex: 1 }}/>
          <BPIcons.ChevronRight size={14} stroke="#b7babe"/>
        </button>
      ))}
    </div>
  );
}

// ----- Share card -----
function ShareCard({ open, a, b, onClose }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,30,35,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520 }}>
        <div style={{
          width: '100%', aspectRatio: '1200/630', background: 'linear-gradient(135deg, #1a1e23 0%, #31353a 100%)',
          borderRadius: 16, padding: 36, color: '#fff', fontFamily: 'var(--font-sans)', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: '#06b281', fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>boospatch</span>
            <span style={{ fontSize: 11, color: '#7e8186' }}>단지 비교</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 18 }}>
            <span style={{ color: a.color }}>{a.name}</span>
            <span style={{ color: '#7e8186', margin: '0 10px' }}>VS</span>
            <span style={{ color: b.color }}>{b.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <SpiderChart a={a} b={b} size={180} axes={['traffic', 'school', 'newness', 'environment', 'investment']} labels={SCORE_LABELS}/>
            <div>
              <div style={{ fontSize: 11, color: '#9a9da2', marginBottom: 4 }}>현재 시세</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: a.color, fontSize: 20, fontWeight: 800 }}>{a.name} · {a.currentPrice}</div>
                <div style={{ color: b.color, fontSize: 20, fontWeight: 800 }}>{b.name} · {b.currentPrice}</div>
              </div>
              <div style={{ fontSize: 11, color: '#7e8186' }}>부스패치에서 더 자세히 보기 →</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
          <Button variant="primary" pill>카카오톡 공유</Button>
          <Button variant="outline" pill>링크 복사</Button>
          <Button variant="outline" pill onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FightWidget, WeightModal, SearchModal, HistoryPanel, ShareCard });
