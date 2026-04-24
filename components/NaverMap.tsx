"use client";

import { useEffect, useRef, useState } from "react";

/* Naver Maps v3 전역 타입 (Script 동적 로드라 공식 타입 없음) */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    naver?: any;
    __naverMapLoading?: Promise<void>;
  }
}

const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

/**
 * Naver Maps JS v3 스크립트를 한 번만 로드.
 * - `ncpKeyId` (신규) 기본, 실패 시 `ncpClientId` (구버전) 폴백
 */
function loadNaverMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.naver?.maps) return Promise.resolve();
  if (window.__naverMapLoading) return window.__naverMapLoading;

  window.__naverMapLoading = new Promise<void>((resolve, reject) => {
    const urls = [
      `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}`,
      `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}`,
    ];
    let idx = 0;
    const tryLoad = () => {
      if (idx >= urls.length) {
        reject(new Error("Naver Maps 로드 실패"));
        return;
      }
      const s = document.createElement("script");
      s.src = urls[idx];
      s.async = true;
      s.onload = () => {
        if (window.naver?.maps) resolve();
        else { idx++; tryLoad(); }
      };
      s.onerror = () => { idx++; tryLoad(); };
      document.head.appendChild(s);
    };
    tryLoad();
  });
  return window.__naverMapLoading;
}

export interface MapPin {
  id: number;
  lat: number;
  lng: number;
  label: string;
  color?: string;
  isPrimary?: boolean;
  isSelected?: boolean;
  index?: number;
}

interface NaverMapProps {
  pins: MapPin[];
  /** 선택 토글 콜백 — primary 제외 */
  onToggle?: (id: number) => void;
  height?: number | string;
}

export default function NaverMap({ pins, onToggle, height = "100%" }: NaverMapProps) {
  const mapEl   = useRef<HTMLDivElement | null>(null);
  const mapRef  = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [error,   setError]   = useState<string | null>(null);
  const [loaded,  setLoaded]  = useState(false);

  /* 1. SDK 로드 + 지도 초기화 (1회) */
  useEffect(() => {
    let cancelled = false;
    if (!NAVER_CLIENT_ID) {
      setError("Naver Client ID 미설정");
      return;
    }
    loadNaverMaps()
      .then(() => {
        if (cancelled || !mapEl.current || !window.naver?.maps) return;
        const naver = window.naver;
        mapRef.current = new naver.maps.Map(mapEl.current, {
          center: new naver.maps.LatLng(37.5665, 126.9780), // 임시 — 핀으로 곧 fit
          zoom: 14,
          minZoom: 6,
          maxZoom: 18,
          zoomControl: true,
          zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT, style: naver.maps.ZoomControlStyle.SMALL },
          scaleControl: false,
          logoControl: true,
          mapDataControl: false,
        });
        setLoaded(true);
      })
      .catch((e) => setError(String(e)));
    return () => { cancelled = true; };
  }, []);

  /* 2. 핀 렌더링 + fit bounds */
  useEffect(() => {
    if (!loaded || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;
    const map = mapRef.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (pins.length === 0) return;

    // 마커 HTML content 생성
    const makeMarker = (pin: MapPin) => {
      const bg = pin.isPrimary ? "#0b66e4"
               : pin.isSelected ? (pin.color ?? "#8d63e9")
               : "#ffffff";
      const fg = pin.isPrimary || pin.isSelected ? "#fff" : "#31353a";
      const border = pin.isPrimary ? "#0b66e4"
                   : pin.isSelected ? (pin.color ?? "#8d63e9")
                   : "#d9e6dd";
      const shadow = pin.isSelected ? "0 4px 12px rgba(0,0,0,0.20)" : "0 2px 6px rgba(0,0,0,0.14)";
      const z = pin.isPrimary ? 1000 : pin.isSelected ? 500 : 100;
      const icon = pin.isPrimary ? "📍 " : "";
      const suffix = pin.isSelected
        ? ' <span style="margin-left:3px">✓</span>'
        : pin.index != null && !pin.isPrimary
          ? ` <span style="margin-left:3px;opacity:0.55;font-weight:600">#${pin.index}</span>`
          : "";

      const content = `
        <div style="
          background:${bg};color:${fg};border:1.5px solid ${border};
          border-radius:14px;padding:5px 10px 6px;font-size:11px;font-weight:800;
          white-space:nowrap;font-family:var(--font-sans);
          box-shadow:${shadow};letter-spacing:-0.01em;
          transform:translateY(-6px);cursor:pointer;
        ">${icon}${escapeHtml(pin.label)}${suffix}</div>
      `;

      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(pin.lat, pin.lng),
        map,
        icon: { content, anchor: new naver.maps.Point(0, 0) },
        zIndex: z,
      });

      if (!pin.isPrimary && onToggle) {
        naver.maps.Event.addListener(marker, "click", () => onToggle(pin.id));
      }
      return marker;
    };

    const markers = pins.map(makeMarker);
    markersRef.current = markers;

    // Fit bounds
    if (pins.length === 1) {
      map.setCenter(new naver.maps.LatLng(pins[0].lat, pins[0].lng));
      map.setZoom(15);
    } else {
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(pins[0].lat, pins[0].lng),
        new naver.maps.LatLng(pins[0].lat, pins[0].lng),
      );
      pins.forEach((p) => bounds.extend(new naver.maps.LatLng(p.lat, p.lng)));
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
    }
  }, [pins, loaded, onToggle]);

  if (error) {
    return (
      <div style={{
        width: "100%", height, borderRadius: 12, background: "#f0f2f6",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: "#9a9da2", padding: 20, textAlign: "center",
      }}>
        지도 로드 실패: {error}<br />
        Naver Cloud Console에서 Web Dynamic Map 서비스 · 현재 도메인 등록 확인 필요
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: 12, overflow: "hidden" }}>
      <div ref={mapEl} style={{ width: "100%", height: "100%" }} />
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0,
          background: "#eaf3ed",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "#7e8186",
        }}>지도 로드 중…</div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] ?? c));
}
