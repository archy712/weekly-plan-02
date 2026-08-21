"use client";

import Link from "next/link";
import { GanttChartSquare, KanbanSquare, List } from "lucide-react";

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

export function WeeklyLogViewSwitcher({
  current,
  filters,
}: {
  current: WeeklyLogView;
  filters: FilterPresetFilters;
}) {
  return (
    <div
      role="tablist"
      aria-label="주간업무일지 보기 전환"
      className="inline-flex w-fit items-center gap-1 rounded-md border bg-muted/30 p-1"
    >
      {VIEWS.map(({ key, href, label, Icon }) => (
        <Link
          key={key}
          href={buildHref(href, filters)}
          role="tab"
          aria-selected={key === current}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors",
            key === current
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </div>
  );
}
