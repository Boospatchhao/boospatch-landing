interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  /** 전주 대비 방향. "up" | "down" | "neutral" */
  trend: "up" | "down" | "neutral";
  /**
   * 급매율처럼 방향이 반전되는 지표 (down이 좋은 것)
   * true면 down=초록, up=빨간
   */
  invertColor?: boolean;
  /** 업데이트 주기 표시 */
  updateCycle?: string;
}

type TrendColor = { text: string; bg: string; badge: string };

function resolveTrendColor(
  trend: StatCardProps["trend"],
  invertColor: boolean
): TrendColor {
  const up: TrendColor = {
    text: "#16A34A",
    bg: "#F0FDF4",
    badge: "#DCFCE7",
  };
  const down: TrendColor = {
    text: "#DC2626",
    bg: "#FEF2F2",
    badge: "#FEE2E2",
  };
  const neutral: TrendColor = {
    text: "var(--color-text-muted)",
    bg: "var(--color-bg-subtle)",
    badge: "var(--color-border)",
  };

  if (trend === "neutral") return neutral;
  if (!invertColor) return trend === "up" ? up : down;
  return trend === "down" ? up : down; // 급매율 등 반전 지표
}

function TrendIcon({ trend }: { trend: StatCardProps["trend"] }) {
  if (trend === "neutral")
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M2 7h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  if (trend === "up")
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M7 2L12 8H2L7 2Z"
          fill="currentColor"
        />
      </svg>
    );
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 12L2 6H12L7 12Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  subtext,
  trend,
  invertColor = false,
  updateCycle,
}: StatCardProps) {
  const color = resolveTrendColor(trend, invertColor);

  return (
    <article
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-5) var(--space-6)",
        minWidth: 140,   /* 모바일 4장 가로스크롤 — 320px 기기에서 카드 하나 + α 보임 */
        flex: "1 1 0",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        boxShadow: "var(--shadow-sm)",
        transition: "box-shadow var(--transition-base), transform var(--transition-base)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "var(--shadow-md)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "var(--shadow-sm)";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* 레이블 + 업데이트 주기 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
        {updateCycle && (
          <span
            style={{
              fontSize: 10,
              color: "var(--color-text-muted)",
              background: "var(--color-bg-subtle)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              padding: "1px 6px",
            }}
          >
            {updateCycle}
          </span>
        )}
      </div>

      {/* 수치 */}
      <p
        style={{
          fontSize: "var(--font-size-3xl)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--color-text)",
          lineHeight: 1.1,
          margin: 0,
        }}
      >
        {value}
      </p>

      {/* 추세 배지 */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          background: color.badge,
          color: color.text,
          borderRadius: "var(--radius-full)",
          padding: "2px 8px",
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-semibold)",
          alignSelf: "flex-start",
        }}
      >
        <TrendIcon trend={trend} />
        {subtext}
      </div>
    </article>
  );
}
