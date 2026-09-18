"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  getRouteProgressServerSnapshot,
  getRouteProgressSnapshot,
  startRouteProgress,
  subscribeRouteProgress,
} from "@/lib/route-progress";

// 내부 링크 클릭을 문서 캡처 단계에서 한 번에 감지한다. 개별 <Link>에 useLinkStatus
// 표시를 일일이 달지 않아도(components/admin-tab-nav.tsx의 TabPendingIndicator 참고)
// 헤더·목록 행·카드·푸터 등 모든 이동이 자동으로 커버되고, 새로 추가되는 링크도 별도
// 조치 없이 동일한 피드백을 받는다.
function isSoftNavigationClick(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
  // 새 탭/창으로 열거나 다운로드하는 클릭은 현재 화면이 그대로 남으므로 대상이 아니다.
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }

  // 외부 도메인·mailto·blob(PDF/Excel 다운로드) 등은 라우트 전환이 아니다.
  if (url.origin !== window.location.origin) return false;
  // 같은 URL 재클릭은 화면이 바뀌지 않아 바를 꺼줄 신호(URL 변경)도 오지 않는다.
  if (url.href === window.location.href) return false;

  return true;
}

export function RouteProgress() {
  const active = useSyncExternalStore(
    subscribeRouteProgress,
    getRouteProgressSnapshot,
    getRouteProgressServerSnapshot,
  );

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isSoftNavigationClick(event, anchor)) return;
      startRouteProgress();
    }

    // 캡처 단계에서 듣는 이유: <Link>의 onClick이 preventDefault로 브라우저 기본 이동을
    // 막기 전에 먼저 클릭을 보기 위해서다(버블 단계에서는 이미 막혀 있을 수 있다).
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-busy="true"
      aria-label="페이지를 불러오는 중"
      // 프리페치가 끝난 링크는 전환이 즉시 커밋돼 바가 깜빡이기만 한다. 투명하게 시작해
      // 120ms 뒤에야 나타나게(fill-mode both) 해서, 실제로 기다리게 되는 이동에만 보인다
      // (Next.js 공식 가이드의 "Gracefully handling fast navigation" 패턴).
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden bg-primary/10 animate-[route-progress-appear_200ms_ease-out_120ms_both]"
    >
      {/* 진행률을 알 수 없으므로 LoadingBar와 동일한 비결정형 애니메이션을 공유한다. */}
      <div className="h-full w-1/4 rounded-r-full bg-primary animate-[indeterminate-slide_1.1s_ease-in-out_infinite]" />
    </div>
  );
}
