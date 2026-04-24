"use client";

import { useState } from "react";
import { logFeedback } from "@/lib/analytics";

interface Props {
  chatId: string;
}

export default function MessageFeedback({ chatId }: Props) {
  const [state, setState] = useState<"idle" | "good" | "bad_ask" | "done">("idle");
  const [text, setText] = useState("");

  const handleGood = async () => {
    await logFeedback(chatId, "good");
    setState("done");
  };

  const handleBadSubmit = async () => {
    await logFeedback(chatId, "bad", text.trim() || undefined);
    setState("done");
  };

  if (state === "done") {
    return (
      <p style={{ fontSize: 11, color: "var(--bp-gray-400)", marginTop: 4 }}>
        피드백 감사합니다 🙏
      </p>
    );
  }

  if (state === "bad_ask") {
    return (
      <div
        style={{
          marginTop: 6,
          padding: 10,
          background: "var(--bp-gray-50)",
          border: "1px solid var(--bp-gray-200)",
          borderRadius: 10,
        }}
      >
        <p style={{ fontSize: 12, color: "var(--bp-gray-600)", marginBottom: 6 }}>
          어떤 부분이 아쉬웠나요? (선택)
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          style={{
            width: "100%",
            fontSize: 13,
            padding: 8,
            border: "1px solid var(--bp-gray-200)",
            borderRadius: 8,
            outline: "none",
            resize: "vertical",
            fontFamily: "var(--font-sans)",
          }}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button
            onClick={handleBadSubmit}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              background: "var(--bp-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            보내기
          </button>
          <button
            onClick={() => setState("done")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              color: "var(--bp-gray-500)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            건너뛰기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
      <button
        onClick={handleGood}
        style={{
          padding: "4px 10px",
          fontSize: 11,
          color: "var(--bp-gray-500)",
          background: "transparent",
          border: "1px solid var(--bp-gray-200)",
          borderRadius: 12,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bp-primary-100)";
          e.currentTarget.style.color = "var(--bp-primary-500)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--bp-gray-500)";
        }}
      >
        👍 도움됐어요
      </button>
      <button
        onClick={() => setState("bad_ask")}
        style={{
          padding: "4px 10px",
          fontSize: 11,
          color: "var(--bp-gray-500)",
          background: "transparent",
          border: "1px solid var(--bp-gray-200)",
          borderRadius: 12,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bp-red-50)";
          e.currentTarget.style.color = "var(--bp-red-500)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--bp-gray-500)";
        }}
      >
        👎 아쉬워요
      </button>
    </div>
  );
}
