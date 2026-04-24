// Boospatch icon set — thin-outline 1.6 stroke (Lucide match)
const I = (path, size = 18) => (props) => {
  const { size: s = size, stroke = 'currentColor', strokeWidth = 1.6, ...rest } = props || {};
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {path}
    </svg>
  );
};

const Icons = {
  Bolt: I(<path d="m13 2-10 12h7l-1 8 10-12h-7z"/>),
  Receipt: I(<><path d="M14 2H6a2 2 0 0 0-2 2v18l4-3 4 3 4-3 4 3V8z"/><path d="M8 9h8M8 13h6"/></>),
  Home: I(<path d="m3 9 9-7 9 7v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>),
  Calculator: I(<><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M8 14h2M14 10h2M14 14h2"/></>),
  Search: I(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>),
  Heart: I(<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>),
  Compare: I(<><path d="M12 3v18M3 12h18"/></>),
  Pin: I(<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>),
  Edit: I(<><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4z"/></>),
  Plus: I(<><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>),
  X: I(<path d="M18 6 6 18M6 6l12 12"/>),
  Refresh: I(<><path d="M20 12a8 8 0 1 1-3-6.2L20 8"/><path d="M20 3v5h-5"/></>),
  Chevron: I(<path d="m6 9 6 6 6-6"/>),
  ChevronRight: I(<path d="m9 18 6-6-6-6"/>),
  ChevronLeft: I(<path d="m15 18-6-6 6-6"/>),
  Arrow: I(<path d="M5 12h14m-6-6 6 6-6 6"/>),
  Check: I(<path d="m5 12 4 4 10-10"/>),
  CheckBox: I(<><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/></>),
  Dots: I(<><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>),
  Excel: I(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 9 8 6M16 9l-8 6"/></>),
  User: I(<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>),
  Minus: I(<><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></>),
  Dash: I(<path d="M5 12h14"/>),
};

window.BPIcons = Icons;
