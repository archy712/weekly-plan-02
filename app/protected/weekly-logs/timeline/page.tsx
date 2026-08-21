import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogTimelineView } from "@/components/weekly-log-timeline-view";
import { WeeklyLogTimelineSkeleton } from "@/components/weekly-log-timeline-skeleton";
import { fetchWeeklyLogsTimeline, normalizeWeeklyLogFilters } from "@/lib/queries/weekly-logs";
import { formatDate } from "@/lib/format";
import { getThisMonthRange } from "@/lib/utils";
import { ALL_DEPARTMENTS_FILTER, WEEKLY_LOGS_TIMELINE_PAGE_SIZE } from "@/lib/types";
import type { Department } from "@/lib/types";

type WeeklyLogTimelineSearchParams = {
  department?: string;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  author?: string;
};

async function WeeklyLogTimelineContent({
  searchParams,
}: {
  searchParams: Promise<WeeklyLogTimelineSearchParams>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id, role")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile?.department_id) {
    redirect("/protected/profile");
  }

  const isAdmin = profile.role === "admin" || profile.role === "superadmin";
  const params = await searchParams;

  // 타임라인은 한 화면에 기간 전체를 그려야 해 목록/칸반과 달리 기간 필터가 항상 필수다 —
  // URL에 from/to가 없는 최초 진입은 이번 달로 기본 설정한다(로드맵 결정, 데이터가
  // 325건+로 계속 늘어나는 상황에서 기간 없이 전체를 그리면 가장 무거운 화면이 되기 때문).
  const defaultRange = getThisMonthRange();
  const filters = normalizeWeeklyLogFilters({
    department: params.department || (isAdmin ? ALL_DEPARTMENTS_FILTER : profile.department_id),
    status: params.status,
    q: params.q,
    from: params.from || defaultRange.from,
    to: params.to || defaultRange.to,
    author: params.author,
  });
  // normalizeWeeklyLogFilters는 department/status 화면과 공유하는 헬퍼라 from/to를
  // string | undefined로 반환하지만, 위에서 항상 유효한 기본값을 넣어 호출했으므로 실제로는
  // 항상 채워져 있다 — 타입 좁히기용 폴백만 유지한다.
  const from = filters.from ?? defaultRange.from;
  const to = filters.to ?? defaultRange.to;

  const [{ items, truncated }, departmentRows] = await Promise.all([
    fetchWeeklyLogsTimeline(
      supabase,
      { ...filters, from, to },
      WEEKLY_LOGS_TIMELINE_PAGE_SIZE,
    ),
    supabase
      .from("departments")
      .select("id, name, created_at, archived_at, organization_id")
      .order("name")
      .then((res) => res.data ?? []),
  ]);

  const departments: Department[] = departmentRows;
  const currentDepartmentName: string | null =
    filters.department === ALL_DEPARTMENTS_FILTER
      ? null
      : (departments.find((dept) => dept.id === filters.department)?.name ?? null);

  return (
    <WeeklyLogTimelineView
      items={items}
      truncated={truncated}
      departments={departments}
      currentDepartmentId={filters.department}
      currentDepartmentName={currentDepartmentName}
      currentSearchQuery={filters.q}
      currentStatus={filters.status}
      currentFrom={from}
      currentTo={to}
      currentAuthorId={filters.author}
      // 막대의 "지연" 강조(목표종료일 경과)는 서버 렌더링 시점 날짜를 그대로 기준으로 삼아
      // 칸반보드·"내 업무" 위젯과 동일한 판정을 보장한다(CLAUDE.md 타임존 절 참고).
      todayIso={formatDate(new Date())}
    />
  );
}

export default function WeeklyLogTimelinePage({
  searchParams,
}: {
  searchParams: Promise<WeeklyLogTimelineSearchParams>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <Suspense fallback={<WeeklyLogTimelineSkeleton />}>
        <WeeklyLogTimelineContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
