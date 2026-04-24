import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      )
    : null;

interface ChatRequestBody {
  message: string;
  sessionId: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

const SYSTEM_PROMPT = `당신은 '하실장'이라는 이름의 부동산 전문 AI 비서입니다.
부스패치에서 제공하는 부동산 데이터를 기반으로 사용자 질문에 답변합니다.

[답변 원칙]
- 이모지 최소화. 전문적이고 신뢰감 있는 톤 유지
- 마크다운 헤딩(#, ##) 사용 금지. 강조는 **볼드**로
- 목록은 - 기호로, 핵심은 **볼드**로
- 간결하고 읽기 쉽게
- 확실하지 않은 내용은 "일반적으로~", "보통~"으로 시작
- 거짓 정보나 수치 만들지 말 것
- 모르면 "정확한 정보가 없어 답변이 어렵습니다"

[대화 맥락]
- 이전 대화를 참고해 연속성 있게 답변
- 사용자가 특정 단지를 분석해달라고 하면, 시스템이 곧 리포트 카드를 보여줄 예정임을 안내하세요.
  (실제 리포트 생성 기능은 현재 개발 중입니다)`;

export async function POST(request: NextRequest) {
  const started = Date.now();
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { message, sessionId, history = [] } = body;
  if (!message || !sessionId) {
    return NextResponse.json({ error: "message and sessionId required" }, { status: 400 });
  }

  // TODO (Week 2-3): classifyIntent → 리포트 의도면 MotherDuck 쿼리 → 카드 데이터 반환
  // 현재는 Week 1 단계로 모든 요청을 텍스트로 응답

  try {
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        ...history.slice(-6).map((h) => ({
          role: h.role,
          content: h.content,
        })),
        { role: "user" as const, content: message },
      ],
    });

    const textBlock = completion.content.find((b) => b.type === "text");
    const aiMsg = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const elapsed = Date.now() - started;

    // Supabase 로깅 (서버사이드)
    let chatId: string | null = null;
    if (supabase) {
      try {
        const { data } = await supabase
          .from("chat_logs")
          .insert({
            session_id: sessionId,
            agent: "finder",
            message_type: "text",
            question: message,
            answer: aiMsg,
            msg_index: (history.filter((h) => h.role === "user").length ?? 0) + 1,
            response_time_ms: elapsed,
          })
          .select("id")
          .single();
        chatId = data?.id ? String(data.id) : null;
      } catch (e) {
        console.error("[chat] supabase log failed:", e);
      }
    }

    return NextResponse.json({
      messageType: "text",
      chatId,
      content: aiMsg,
    });
  } catch (err) {
    console.error("[chat] anthropic error:", err);
    return NextResponse.json(
      { error: "AI 응답 실패. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
