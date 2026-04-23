/**
 * 1~3위 금/은/동 메달 배지 (SVG)
 * 시황 히트맵, 반등거래 등 랭킹 UI 공용.
 */
export default function MedalBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const palette = {
    1: { ring: "#E8A617", disc: "#FFD34D", shine: "#FFE98A", ribbonL: "#DC2626", ribbonR: "#2563EB" },
    2: { ring: "#9CA3AF", disc: "#D1D5DB", shine: "#E5E7EB", ribbonL: "#DC2626", ribbonR: "#2563EB" },
    3: { ring: "#A8663A", disc: "#D58E56", shine: "#E7AC74", ribbonL: "#DC2626", ribbonR: "#2563EB" },
  }[rank];
  return (
    <svg width="26" height="28" viewBox="0 0 26 28" aria-label={`${rank}위 메달`}>
      <path d="M5 0 L2 0 L7.5 13 L10.5 11 Z" fill={palette.ribbonL} />
      <path d="M21 0 L24 0 L18.5 13 L15.5 11 Z" fill={palette.ribbonR} />
      <circle cx="13" cy="18" r="9" fill={palette.disc} stroke={palette.ring} strokeWidth="1.4" />
      <ellipse cx="10" cy="15" rx="4" ry="2.5" fill={palette.shine} opacity="0.55" />
      <text x="13" y="21.5" textAnchor="middle"
        style={{ fontSize: 11, fontWeight: 900, fill: "#1a1e23", fontFamily: "var(--font-sans)" }}>
        {rank}
      </text>
    </svg>
  );
}
