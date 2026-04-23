import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import FloatingCTA from "@/components/FloatingCTA";
import MobileBottomTabBar from "@/components/MobileBottomTabBar";

export const metadata: Metadata = {
  title: "부스패치 — 무료 랜딩페이지로 매물 노출을 높이세요",
  description: "부스패치는 부동산 중개사무소를 위한 무료 랜딩페이지 서비스입니다. 지금 바로 시작하세요.",
};

// Next.js 15+ — viewport는 별도 export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col">
        <Header />
        <main style={{ paddingTop: "var(--header-height)", flex: 1 }}>
          {children}
        </main>
        {/* 데스크탑: 플로팅 CTA / 모바일: 하단 탭바 (내부에서 isMobile로 분기) */}
        <FloatingCTA />
        <MobileBottomTabBar />
      </body>
    </html>
  );
}
