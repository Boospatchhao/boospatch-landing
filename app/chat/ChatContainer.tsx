"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import type { ChatMessage, ChatResponse } from "./types";
import { getSessionId, logChat, logEvent } from "@/lib/analytics";

function makeId() {
  return crypto.randomUUID();
}

export default function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const sessionIdRef = useRef<string>("");
  const msgIndexRef = useRef(0);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    // 세션 시작 기록
    logEvent("chat_session_start", "finder");
  }, []);

  const handleSend = useCallback(async (userMessage: string) => {
    const trimmed = userMessage.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: makeId(),
      role: "assistant",
      content: "",
      messageType: "text",
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsSending(true);

    const started = Date.now();
    msgIndexRef.current += 1;
    const currentIndex = msgIndexRef.current;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionIdRef.current,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ChatResponse = await res.json();
      const elapsed = Date.now() - started;

      if (data.messageType === "text") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: data.content, chatId: data.chatId, messageType: "text" }
              : m
          )
        );
        // 클라이언트 로깅 (백엔드에서 먼저 저장하므로 chatId를 받아 사용)
        if (!data.chatId) {
          // 백엔드 저장 실패 시 클라이언트에서라도 저장 시도
          await logChat({
            agent: "finder",
            messageType: "text",
            userMsg: trimmed,
            aiMsg: data.content,
            msgIndex: currentIndex,
            responseTimeMs: elapsed,
            sessionId: sessionIdRef.current,
          });
        }
      } else {
        // report
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: data.data.intro,
                  chatId: data.chatId,
                  messageType: "report",
                  reportData: data.data,
                }
              : m
          )
        );
        await logEvent("report_complete", "finder", {
          danji_name: data.data.danjiInfo.danji_name,
        }, sessionIdRef.current);
      }
    } catch (err) {
      console.error("chat error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content: "서버 연결에 문제가 있어요. 잠시 후 다시 시도해주세요.",
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  }, [isSending, messages]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--bp-gray-50)",
      }}
    >
      <header
        style={{
          padding: "14px 16px",
          background: "#fff",
          borderBottom: "1px solid var(--bp-gray-200)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--bp-primary-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--bp-primary-500)",
            fontSize: 16,
          }}
          aria-hidden
        >
          🔍
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--bp-gray-900)" }}>
            AI 파인더
          </div>
          <div style={{ fontSize: 11, color: "var(--bp-gray-500)" }}>
            단지명을 입력하면 분석 리포트가 나와요
          </div>
        </div>
      </header>

      <MessageList messages={messages} isSending={isSending} />

      <MessageInput onSend={handleSend} disabled={isSending} />
    </div>
  );
}
