// Left-nav bar (LNB) for in-app surfaces
const LNB_ITEMS = [
  { id: 'today',  label: '실거래 투데이',   icon: 'Bolt' },
  { id: 'urgent', label: '급매 투데이',     icon: 'Receipt' },
  { id: 'invest', label: '투자단지 분석',   icon: 'Home' },
  { id: 'calc',   label: '내집마련 계산기', icon: 'Calculator' },
  { id: 'finder', label: '내집 파인더',     icon: 'Search' },
  { id: 'fav',    label: '관심단지',         icon: 'Heart' },
  { id: 'compare',label: '단지 비교',        icon: 'Compare' },
  { id: 'region', label: '지역 분석',        icon: 'Pin', muted: true, badge: '준비중' },
];

function LNB({ active, onSelect }) {
  return (
    <aside style={{
      width: 220, minHeight: '100%', background: '#fff',
      borderRight: '1px solid #e4e6ea', padding: '18px 14px',
      display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 220px',
    }}>
      <div style={{ padding: '6px 12px 18px' }}>
        <img src={window.__resources.logoDefault} height="22" alt="boospatch" />
      </div>
      {LNB_ITEMS.map((it) => {
        const Icon = BPIcons[it.icon];
        const isActive = active === it.id;
        return (
          <button key={it.id} onClick={() => onSelect && onSelect(it.id)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
            borderRadius: 8, border: 0, fontSize: 14, cursor: 'pointer',
            background: isActive ? '#e7f8f4' : 'transparent',
            color: it.muted ? '#b7babe' : isActive ? '#06b281' : '#494d52',
            fontWeight: isActive ? 700 : 500, textAlign: 'left',
            letterSpacing: '-0.01em', transition: 'background 120ms',
          }}>
            <Icon size={18} />
            <span style={{ flex: 1 }}>{it.label}</span>
            {it.badge && <span style={{ fontSize: 10, color: '#9a9da2', background: '#f0f2f6', padding: '2px 6px', borderRadius: 4 }}>{it.badge}</span>}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: '1px solid #e4e6ea' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 999, background: '#e7f8f4',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#06b281',
        }}><BPIcons.User size={18}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>김부패님</div>
          <div style={{ fontSize: 11, color: '#9a9da2' }}>일반회원</div>
        </div>
        <BPIcons.Dots size={16} />
      </div>
    </aside>
  );
}

window.LNB = LNB;
