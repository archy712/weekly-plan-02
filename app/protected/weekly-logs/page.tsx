import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogListView } from "@/components/weekly-log-list-view";
import { WeeklyLogListSkeleton } from "@/components/weekly-log-list-skeleton";
import { MyWorkSummaryWidget } from "@/components/my-work-summary-widget";
import { MyWorkSummarySkeleton } from "@/components/my-work-summary-skeleton";
import {
  countWeeklyLogs,
  fetchWeeklyLogsPage,
  normalizeWeeklyLogFilters,
  normalizeWeeklyLogSort,
} from "@/lib/queries/weekly-logs";
import { getMyWorkSummary } from "@/lib/queries/stats";
import { formatDate } from "@/lib/format";
import { ALL_DEPARTMENTS_FILTER, WEEKLY_LOGS_PAGE_SIZE } from "@/lib/types";
import type { Department } from "@/lib/types";

type WeeklyLogsSearchParams = {
  department?: string;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: string;
  author?: string;
};

// Task 040(F040) "내 업무" 위젯 전용 조회. 목록(WeeklyLogsContent)과 별도의 Suspense
// 경계로 감싸(app/protected/weekly-logs/page.tsx 하단) 위젯 집계가 느려지거나 실패해도
// 목록 스트리밍이 지연되지 않게 한다. 인증 확인을 목록 쪽과 중복으로 한 번 더 하는 이유는
// cacheComponents: true 하에서 이 컴포넌트가 독립적으로 스트리밍되려면 그 자신이 직접
// 동적 데이터(createClient의 cookies())에 접근해야 하고, 그 접근은 이 컴포넌트를 감싸는
// Suspense 경계 안에서 이뤄져야 하기 때문이다(공통 상위 컴포넌트의 인증 결과를 재사용할
// 수 없음).
async function MyWorkSummarySection() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // 칸반보드(app/protected/weekly-logs/kanban/page.tsx)와 동일하게 서버 렌더링 시점의
  // Node 날짜를 today_param으로 넘긴다 — RPC 내부는 current_date를 참조하지 않으므로
  // 이 값이 두 화면의 "지연" 판정을 일치시키는 유일한 축이다(CLAUDE.md 타임존 절 참고).
  const todayIso = formatDate(new Date());
  const summary = await getMyWorkSummary(data.claims.sub, todayIso);

  return (
    <MyWorkSummaryWidget summary={summary} authorId={data.claims.sub} todayIso={todayIso} />
  );
}

async function WeeklyLogsContent({
  searchParams,
}: {
  searchParams: Promise<WeeklyLogsSearchParams>;
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

  // weekly_logs SELECT는 전 부서 공개이므로 department 파라미터는 누구나 사용할 수 있다.
  // 쓰기(등록/수정/삭제)는 RLS에서 여전히 소속 부서(또는 admin)로만 제한된다.
  // 파라미터가 없는 첫 진입 시 기본값은 admin은 전체, 일반 유저는 소속 부서로 좁힌다.
  // (상태·날짜·검색어·정렬 정규화는 normalizeWeeklyLog* 헬퍼가 담당한다.)
  const filters = normalizeWeeklyLogFilters({
    department: params.department || (isAdmin ? ALL_DEPARTMENTS_FILTER : profile.department_id),
    status: params.status,
    q: params.q,
    from: params.from,
    to: params.to,
    author: params.author,
  });
  const sort = normalizeWeeklyLogSort({ key: params.sort, direction: params.dir });

  // 첫 배치(30건)와 부서 목록을 병렬로 조회한다. 이후 배치는 클라이언트가 스크롤 시점에
  // loadMoreWeeklyLogsAction으로 이어서 가져온다.
  const [page, departmentRows, totalCount] = await Promise.all([
    fetchWeeklyLogsPage(supabase, filters, sort, 0, WEEKLY_LOGS_PAGE_SIZE),
    supabase
      .from("departments")
      .select("id, name, created_at, archived_at, organization_id, division_id")
      .order("name")
      .then((res) => res.data ?? []),
    countWeeklyLogs(supabase, filters),
  ]);

  const departments: Department[] = departmentRows;
  const currentDepartmentName: string | null =
    filters.department === ALL_DEPARTMENTS_FILTER
      ? null
      : (departments.find((dept) => dept.id === filters.department)?.name ?? null);

  return (
    <WeeklyLogListView
      initialItems={page.items}
      initialHasMore={page.hasMore}
      totalCount={totalCount}
      departments={departments}
      currentDepartmentId={filters.department}
      currentDepartmentName={currentDepartmentName}
      currentSearchQuery={filters.q}
      currentStatus={filters.status}
      currentFrom={filters.from}
      currentTo={filters.to}
      currentAuthorId={filters.author}
      currentSortKey={sort.key}
      currentSortDirection={sort.direction}
      userId={data.claims.sub}
    />
  );
}

export default function WeeklyLogsPage({
  searchParams,
}: {
  searchParams: Promise<WeeklyLogsSearchParams>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* 목록과 별도의 Suspense 경계 — 위젯 집계(RPC 왕복)가 느리거나 실패해도 아래 목록
          스트리밍을 지연시키지 않는다(Task 040/F040). */}
      <Suspense fallback={<MyWorkSummarySkeleton />}>
        <MyWorkSummarySection />
      </Suspense>
      <Suspense fallback={<WeeklyLogListSkeleton />}>
        <WeeklyLogsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
