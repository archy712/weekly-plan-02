import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogListView } from "@/components/weekly-log-list-view";
import { WeeklyLogListSkeleton } from "@/components/weekly-log-list-skeleton";
import {
  fetchWeeklyLogsPage,
  normalizeWeeklyLogFilters,
  normalizeWeeklyLogSort,
} from "@/lib/queries/weekly-logs";
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
};

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
  });
  const sort = normalizeWeeklyLogSort({ key: params.sort, direction: params.dir });

  // 첫 배치(30건)와 부서 목록을 병렬로 조회한다. 이후 배치는 클라이언트가 스크롤 시점에
  // loadMoreWeeklyLogsAction으로 이어서 가져온다.
  const [page, departmentRows] = await Promise.all([
    fetchWeeklyLogsPage(supabase, filters, sort, 0, WEEKLY_LOGS_PAGE_SIZE),
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
    <WeeklyLogListView
      initialItems={page.items}
      initialHasMore={page.hasMore}
      departments={departments}
      currentDepartmentId={filters.department}
      currentDepartmentName={currentDepartmentName}
      currentSearchQuery={filters.q}
      currentStatus={filters.status}
      currentFrom={filters.from}
      currentTo={filters.to}
      currentSortKey={sort.key}
      currentSortDirection={sort.direction}
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
      <Suspense fallback={<WeeklyLogListSkeleton />}>
        <WeeklyLogsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
