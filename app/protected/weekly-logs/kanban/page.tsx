import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogKanbanView } from "@/components/weekly-log-kanban-view";
import { WeeklyLogKanbanSkeleton } from "@/components/weekly-log-kanban-skeleton";
import { fetchWeeklyLogsKanban, normalizeWeeklyLogFilters } from "@/lib/queries/weekly-logs";
import { formatDate } from "@/lib/format";
import { ALL_DEPARTMENTS_FILTER, WEEKLY_LOGS_KANBAN_COLUMN_PAGE_SIZE } from "@/lib/types";
import type { Department } from "@/lib/types";

type WeeklyLogKanbanSearchParams = {
  department?: string;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  author?: string;
};

async function WeeklyLogKanbanContent({
  searchParams,
}: {
  searchParams: Promise<WeeklyLogKanbanSearchParams>;
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

  // 목록 페이지(app/protected/weekly-logs/page.tsx)와 완전히 동일한 조회조건 정규화·기본값
  // 규칙을 재사용한다 — 파라미터가 없는 첫 진입은 admin 전체/일반 유저 소속 부서.
  const filters = normalizeWeeklyLogFilters({
    department: params.department || (isAdmin ? ALL_DEPARTMENTS_FILTER : profile.department_id),
    status: params.status,
    q: params.q,
    from: params.from,
    to: params.to,
    author: params.author,
  });

  const [columns, departmentRows] = await Promise.all([
    fetchWeeklyLogsKanban(supabase, filters, WEEKLY_LOGS_KANBAN_COLUMN_PAGE_SIZE),
    supabase
      .from("departments")
      .select("id, name, created_at, archived_at, organization_id, division_id")
      .order("name")
      .then((res) => res.data ?? []),
  ]);

  const departments: Department[] = departmentRows;
  const currentDepartmentName: string | null =
    filters.department === ALL_DEPARTMENTS_FILTER
      ? null
      : (departments.find((dept) => dept.id === filters.department)?.name ?? null);

  return (
    <WeeklyLogKanbanView
      initialColumns={columns}
      departments={departments}
      currentDepartmentId={filters.department}
      currentDepartmentName={currentDepartmentName}
      currentSearchQuery={filters.q}
      currentStatus={filters.status}
      currentFrom={filters.from}
      currentTo={filters.to}
      currentAuthorId={filters.author}
      currentUserDepartmentId={profile.department_id}
      isAdmin={isAdmin}
      // 카드의 "지연" 표시(목표종료일 경과)는 서버 렌더링 시점 날짜를 그대로 기준으로 삼아
      // 클라이언트 컴포넌트 초기 렌더와 SSR 결과가 항상 일치하게 한다.
      todayIso={formatDate(new Date())}
      userId={data.claims.sub}
    />
  );
}

export default function WeeklyLogKanbanPage({
  searchParams,
}: {
  searchParams: Promise<WeeklyLogKanbanSearchParams>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <Suspense fallback={<WeeklyLogKanbanSkeleton />}>
        <WeeklyLogKanbanContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
