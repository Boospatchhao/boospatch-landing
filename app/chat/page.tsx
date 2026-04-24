import type { Metadata } from "next";
import ChatContainer from "./ChatContainer";

export const metadata: Metadata = {
  title: "AI 파인더 · 부스패치",
  description: "단지명을 입력하면 실거래가·입지·학군·매물 분석 리포트를 채팅창 안에서 바로 확인",
};

export default function ChatPage() {
  return <ChatContainer />;
}
