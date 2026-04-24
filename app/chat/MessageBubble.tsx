"use client";

import type { ChatMessage } from "./types";
import MessageFeedback from "./MessageFeedback";
import ReportMessage from "./ReportMessage";

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "82%",
            padding: "10px 14px",
            background: "var(--bp-primary)",
            color: "#fff",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 14,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // AI 메시지
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

      {message.messageType === "report" && message.reportData ? (
        <ReportMessage data={message.reportData} />
      ) : (
        message.content && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fff",
              border: "1px solid var(--bp-gray-200)",
              borderRadius: "4px 16px 16px 16px",
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--bp-gray-900)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxWidth: "90%",
            }}
          >
            {message.content}
          </div>
        )
      )}

      {message.chatId && <MessageFeedback chatId={message.chatId} />}
    </div>
  );
}
