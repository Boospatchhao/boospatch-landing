"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "./types";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface Props {
  messages: ChatMessage[];
  isSending: boolean;
}

const WELCOME_EXAMPLES = [
  "반포자이 어때?",
  "래미안 퍼스티지 분석해줘",
  "반포자이 vs 아크로리버파크 (다음 버전 예정)",
];

export default function MessageList({ messages, isSending }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 20px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 44 }} aria-hidden>
          🔍
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--bp-gray-900)",
            textAlign: "center",
          }}
        >
          단지명을 입력하면<br />분석 리포트가 바로 나와요
        </div>
        <div style={{ fontSize: 12, color: "var(--bp-gray-500)", marginBottom: 4 }}>
          이런 식으로 물어보세요
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 320 }}>
          {WELCOME_EXAMPLES.map((ex) => (
            <div
              key={ex}
              style={{
                padding: "10px 14px",
                background: "#fff",
                border: "1px solid var(--bp-gray-200)",
                borderRadius: 12,
                fontSize: 13,
                color: "var(--bp-gray-600)",
                textAlign: "center",
              }}
            >
              &quot;{ex}&quot;
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 14px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {isSending && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
