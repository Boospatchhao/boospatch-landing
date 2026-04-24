// Boospatch primitives: Button, Chip, Tag, Checkbox, IconButton

function Button({ variant = 'primary', size = 'md', pill = false, children, ...rest }) {
  const styles = {
    fontFamily: 'var(--font-sans)', fontWeight: 700, letterSpacing: '-0.01em',
    cursor: 'pointer', border: '1px solid transparent',
    borderRadius: pill ? 999 : 8,
    fontSize: size === 'lg' ? 15 : size === 'sm' ? 12 : 14,
    padding: size === 'lg' ? '12px 22px' : size === 'sm' ? '8px 14px' : '10px 18px',
    transition: 'background 120ms, color 120ms',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    whiteSpace: 'nowrap',
  };
  const variants = {
    primary: { background: '#06b281', color: '#fff' },
    primaryDark: { background: '#1a1e23', color: '#fff' },
    soft: { background: '#e7f8f4', color: '#06b281' },
    dark: { background: '#484961', color: '#fff' },
    danger: { background: '#ec432c', color: '#fff' },
    outline: { background: '#fff', color: '#1a1e23', borderColor: '#e4e6ea' },
    ghost: { background: 'transparent', color: '#494d52' },
    purple: { background: '#8d63e9', color: '#fff' },
  };
  return <button style={{ ...styles, ...variants[variant] }} {...rest}>{children}</button>;
}

function Chip({ selected, muted, filled, pill = false, children, ...rest }) {
  const base = {
    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
    padding: '9px 14px', borderRadius: pill ? 999 : 8, cursor: 'pointer',
    background: '#fff', border: '1px solid #e4e6ea', color: '#31353a',
    transition: 'background 120ms', whiteSpace: 'nowrap',
  };
  if (muted) Object.assign(base, { background: '#f0f2f6', color: '#7e8186', border: '1px solid transparent' });
  if (selected) Object.assign(base, { background: '#e7f8f4', color: '#06b281', fontWeight: 700, border: '1px solid transparent' });
  if (filled) Object.assign(base, { background: '#06b281', color: '#fff', fontWeight: 700, border: '1px solid transparent' });
  return <span style={base} {...rest}>{children}</span>;
}

function Tag({ tone = 'green', variant = 'solid', pill = false, children }) {
  const tones = {
    red:   { solid: ['#ec432c', '#fff'], soft: ['#fdecea', '#ec432c'], out: ['#fff', '#ec432c'] },
    blue:  { solid: ['#0b66e4', '#fff'], soft: ['#e7f0fc', '#0b66e4'], out: ['#fff', '#0b66e4'] },
    green: { solid: ['#06b281', '#fff'], soft: ['#e7f8f4', '#06b281'], out: ['#fff', '#06b281'] },
    dark:  { solid: ['#31353a', '#fff'], soft: ['#f0f2f6', '#494d52'], out: ['#fff', '#31353a'] },
  };
  const [bg, fg] = tones[tone][variant];
  const style = {
    background: bg, color: fg,
    border: variant === 'out' ? `1px solid ${fg}` : '1px solid transparent',
    fontSize: 11, fontWeight: 700, padding: '3px 8px',
    borderRadius: pill ? 999 : 4, display: 'inline-block', letterSpacing: '-0.01em',
  };
  return <span style={style}>{children}</span>;
}

function Checkbox({ checked, onChange, indeterminate, label }) {
  const box = {
    width: 18, height: 18, borderRadius: 4, flex: '0 0 18px',
    border: checked || indeterminate ? '1.5px solid #06b281' : '1.5px solid #b7babe',
    background: checked || indeterminate ? '#06b281' : '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', cursor: 'pointer', transition: 'all 120ms',
  };
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#31353a', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', minWidth: 0 }}>
      <span style={box} onClick={onChange}>
        {checked && <BPIcons.Check size={12} strokeWidth={2.5} />}
        {indeterminate && !checked && <BPIcons.Dash size={12} strokeWidth={2.5} />}
      </span>
      {label && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
    </label>
  );
}

function IconButton({ children, onClick, size = 32 }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size, borderRadius: 999, border: 0,
        background: hover ? '#f0f2f6' : 'transparent', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#494d52', transition: 'background 120ms',
      }}>{children}</button>
  );
}

Object.assign(window, { Button, Chip, Tag, Checkbox, IconButton });
