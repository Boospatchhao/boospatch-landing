"use client";

import HeroSection from "@/components/HeroSection";
import Tab2KB from "@/components/tabs/Tab2KB";

/**
 * 탭 1: 부동산 시황
 * HeroSection(수치카드 + KB 히트맵) + Tab2KB(KB 시계열) 합성.
 */
export default function Tab0Market() {
  return (
    <>
      <HeroSection />
      <Tab2KB />
    </>
  );
}
