"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { LoadingBar } from "@/components/loading-bar";

// 필터가 URL 쿼리파라미터를 바꾸는 soft navigation은 페이지의 Suspense fallback(스켈레톤)을
// 다시 띄우지 않아, 서버 재조회 동안 화면이 멈춘 것처럼 보인다(weekly-log-list-view.tsx의
// 로컬 useTransition 패턴과 동일한 문제). 필터와 결과가 서로 다른 컴포넌트로 분리된 화면
// (예: 대시보드 — 필터 바와 차트가 별개)에서는 로컬 useTransition으로 pending을 공유할 수
// 없으므로, Provider가 transition을 소유하고 navigate/isPending을 Context로 내려준다.
//
// 필터와 결과가 한 컴포넌트에 있는 자기완결형 화면(주간업무 목록·사용자 관리)은 이 Provider
// 없이 컴포넌트 내부에서 직접 useTransition + LoadingBar를 쓰는 편이 단순하다.

type NavigationProgressContextValue = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(null);

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <NavigationProgressContext.Provider value={{ isPending, navigate }}>
      <LoadingBar active={isPending} />
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);
  if (!context) {
    throw new Error("useNavigationProgress must be used within a NavigationProgressProvider");
  }
  return context;
}

// 서버 재조회 중 결과 영역을 흐리게+비활성화해 "갱신 중"임을 알린다(컨텍스트는 유지).
// 필터 바는 이 래퍼 밖에 두어 로딩 중에도 계속 조작할 수 있게 한다.
export function DimOnPending({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { isPending } = useNavigationProgress();
  return (
    <div
      className={cn("transition-opacity", isPending && "pointer-events-none opacity-60", className)}
      aria-busy={isPending}
    >
      {children}
    </div>
  );
}
