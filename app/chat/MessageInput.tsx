"use client";

import { useState, KeyboardEvent } from "react";

interface Props {
  onSend: (msg: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const v = value.trim();
    if (!v || disabled) return;
    onSend(v);
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        padding: "10px 12px 14px",
        background: "#fff",
        borderTop: "1px solid var(--bp-gray-200)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          background: "var(--bp-gray-50)",
          borderRadius: 18,
          padding: "6px 6px 6px 14px",
          border: "1px solid var(--bp-gray-200)",
        }}
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder="단지명이나 질문을 입력하세요"
          rows={1}
          disabled={disabled}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            fontFamily: "var(--font-sans)",
            color: "var(--bp-gray-900)",
            resize: "none",
            maxHeight: 100,
            lineHeight: 1.55,
            padding: "8px 0",
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="전송"
          style={{
            width: 36,
            height: 36,
            border: "none",
            borderRadius: "50%",
            background:
              disabled || !value.trim() ? "var(--bp-gray-300)" : "var(--bp-primary)",
            color: "#fff",
            cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
}
