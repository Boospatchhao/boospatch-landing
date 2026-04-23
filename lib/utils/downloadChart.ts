"use client";

import { toJpeg } from "html-to-image";

/**
 * 차트 DOM 노드를 JPG로 변환해 다운로드.
 * recharts SVG + 주변 설명 텍스트를 한 장으로 캡처.
 */
export async function downloadChartAsJpg(
  node: HTMLElement | null,
  filename: string,
): Promise<void> {
  if (!node) return;

  const safeName = filename.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");

  try {
    const dataUrl = await toJpeg(node, {
      quality: 0.95,
      backgroundColor: "#ffffff",
      pixelRatio: 2, // retina 해상도
      cacheBust: true,
    });

    const link = document.createElement("a");
    link.download = `${safeName}.jpg`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("[downloadChartAsJpg] failed", err);
    alert("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
  }
}
