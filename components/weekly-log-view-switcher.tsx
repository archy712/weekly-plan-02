"use client";

import Link, { useLinkStatus } from "next/link";
import {
  GanttChartSquare,
  KanbanSquare,
  List,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { FilterPresetFilters } from "@/hooks/use-filter-presets";

// F047(v2 Task 048) 뷰 전환 — 목록·칸반·타임라인 3개 화면이 공유하는 탭 컨트롤. 헤더의
// 고정 "칸반보드" 링크(components/header-nav.tsx)와 달리 현재 필터 조건을 쿼리 파라미터로
// 그대로 실어 전환한다(필터를 다시 입력하게 만들지 않는다는 로드맵 요구사항). sort/dir은
// 목록 전용 축이라 여기 실지 않는다 — 칸반·타임라인으로 전환하면 자연스럽게 각 화면의
// 고정 정렬(칸반=목표종료일, 타임라인=시작일)로 보이고, 다시 목록으로 돌아오면 기본 정렬로
// 초기화된다(허용 가능한 손실 — 필터 조건 유지가 핵심 요구사항).
const VIEWS = [
  { key: "list", href: "/protected/weekly-logs", label: "목록", Icon: List },
  { key: "kanban", href: "/protected/weekly-logs/kanban", label: "칸반보드", Icon: KanbanSquare },
  {
    key: "timeline",
    href: "/protected/weekly-logs/timeline",
    label: "타임라인",
    Icon: GanttChartSquare,
  },
] as const;

export type WeeklyLogView = (typeof VIEWS)[number]["key"];

function buildHref(basePath: string, filters: FilterPresetFilters): string {
  const params = new URLSearchParams();
  params.set("department", filters.department);
  params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.author) params.set("author", filters.author);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

// 뷰 전환은 다른 라우트로의 이동이라 대상 화면의 loading.tsx 스켈레톤이 결국 뜨지만,
// 클릭 직후 RSC 페이로드를 기다리는 짧은 공백에는 "어느 탭을 눌렀는지" 표시가 없다.
// 관리자 콘솔 탭(components/admin-tab-nav.tsx의 TabPendingIndicator)과 동일하게
// useLinkStatus로 감싸는 <Link>의 pending을 읽어, 아이콘 자리를 스피너로 바꿔 넣는다
// (새 요소를 추가하지 않으므로 레이아웃이 밀리지 않는다 — Next.js 공식 권고).
function ViewTabIcon({ Icon }: { Icon: LucideIcon }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return <Loader2 className="size-4 animate-spin" aria-hidden />;
  }
  return <Icon className="size-4" aria-hidden />;
}

export function WeeklyLogViewSwitcher({
  current,
  filters,
}: {
  current: WeeklyLogView;
  filters: FilterPresetFilters;
}) {
  return (
    // 모바일에서는 w-fit이라 탭 3개가 왼쪽에 작게 뭉쳐 있고 오른쪽이 비어 보인다는 피드백에
    // 따라, 좁은 화면에서는 폭 전체를 3등분(flex-1)해 채우고 sm 이상에서만 기존처럼
    // 내용 크기만큼만 차지하도록 되돌린다(다운로드·신규 작성 버튼과 한 줄에 나란히 둘 공간이
    // 충분해지므로).
    <div
      role="tablist"
      aria-label="진행업무 보기 전환"
      className="flex w-full items-center gap-1 rounded-md border bg-muted/30 p-1 sm:w-fit"
    >
      {VIEWS.map(({ key, href, label, Icon }) => (
        <Link
          key={key}
          href={buildHref(href, filters)}
          role="tab"
          aria-selected={key === current}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors sm:flex-none",
            key === current
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ViewTabIcon Icon={Icon} />
          {label}
        </Link>
      ))}
    </div>
  );
}
