"use client";

export default function TypingIndicator() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: "var(--bp-primary-100)",
            color: "var(--bp-primary-500)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}
          aria-hidden
        >
          ◉
        </div>
        <span style={{ fontSize: 12, color: "var(--bp-gray-500)", fontWeight: 600 }}>
          하실장
        </span>
      </div>
      <div
        style={{
          padding: "12px 16px",
          background: "#fff",
          border: "1px solid var(--bp-gray-200)",
          borderRadius: "4px 16px 16px 16px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "fit-content",
        }}
      >
        <span className="bp-dot" style={{ animationDelay: "0ms" }} />
        <span className="bp-dot" style={{ animationDelay: "180ms" }} />
        <span className="bp-dot" style={{ animationDelay: "360ms" }} />
      </div>
      <style jsx>{`
        .bp-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--bp-gray-350);
          animation: bpDotBounce 1.2s infinite ease-in-out;
        }
        @keyframes bpDotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
