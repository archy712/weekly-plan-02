import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  getLogsByDepartment,
  getLogsByStatus,
  getMonthlyTrend,
  getWorkloadSummary,
} from "@/lib/queries/stats";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { DashboardSummaryCards } from "@/components/dashboard-summary-cards";
import { DashboardDepartmentChart } from "@/components/dashboard-department-chart";
import { DashboardStatusChart } from "@/components/dashboard-status-chart";
import { DashboardTrendChart } from "@/components/dashboard-trend-chart";
import {
  DashboardWorkloadChart,
  type DepartmentWorkload,
} from "@/components/dashboard-workload-chart";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type { Department, DepartmentFilter } from "@/lib/types";

// 목록 페이지(app/protected/weekly-logs/page.tsx)와 동일한 방어: 형식이 올바르지 않은
// from/to는 500 크래시 대신 조용히 무시한다.
const dateParamSchema = z.string().date();

// 월별 추이 차트가 보여줄 기간(현재 달 포함 최근 N개월).
const TREND_MONTHS = 6;

type DashboardSearchParams = {
  department?: string;
  from?: string;
  to?: string;
};

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", data.claims.sub)
    .maybeSingle();

  // 부서 미설정 사용자는 다른 보호 페이지들과 동일하게 프로필로 유도한다(CLAUDE.md 관례).
  if (!profile?.department_id) {
    redirect("/protected/profile");
  }

  const {
    department: departmentParam,
    from: fromParam,
    to: toParam,
  } = await searchParams;

  const selectedDepartment: DepartmentFilter = departmentParam || ALL_DEPARTMENTS_FILTER;
  const departmentId =
    selectedDepartment === ALL_DEPARTMENTS_FILTER ? undefined : selectedDepartment;

  let fromDate = fromParam && dateParamSchema.safeParse(fromParam).success ? fromParam : undefined;
  let toDate = toParam && dateParamSchema.safeParse(toParam).success ? toParam : undefined;
  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }
  const range = { from: fromDate, to: toDate };

  const { data: departmentRows } = await supabase
    .from("departments")
    .select("id, name, created_at, archived_at")
    .order("name");
  const departments: Department[] = departmentRows ?? [];

  const [departmentStats, statusStats, monthlyTrend] = await Promise.all([
    getLogsByDepartment(range),
    getLogsByStatus(range, departmentId),
    getMonthlyTrend(TREND_MONTHS, departmentId),
  ]);

  // stats_workload_summary는 부서별 그룹화 없이 단일 행 요약만 반환하므로(Task 030),
  // "부서별" 비교 차트를 만들려면 부서마다 개별 호출해야 한다. departmentStats에 이미
  // 등장한 부서(=이 기간에 로그가 1건이라도 있는 부서)만 대상으로 삼아 불필요한 호출과
  // 0건짜리 빈 막대를 피한다.
  const workloadRows = await Promise.all(
    departmentStats.map(async (dept) => {
      const [summary] = await getWorkloadSummary(range, dept.department_id);
      return {
        department_id: dept.department_id,
        department_name: dept.department_name,
        mm_sum: summary?.mm_sum ?? 0,
        mm_count: summary?.mm_count ?? 0,
        cost_sum: summary?.cost_sum ?? 0,
        cost_count: summary?.cost_count ?? 0,
      } satisfies DepartmentWorkload;
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">통계 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          부서별·기간별 주간업무일지 현황을 한눈에 확인합니다.
        </p>
      </div>
      <DashboardFilters
        departments={departments}
        currentDepartmentId={selectedDepartment}
        currentFrom={fromDate}
        currentTo={toDate}
      />
      <DashboardSummaryCards statusStats={statusStats} monthlyTrend={monthlyTrend} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardDepartmentChart data={departmentStats} />
        <DashboardStatusChart data={statusStats} />
        <DashboardTrendChart data={monthlyTrend} />
        <DashboardWorkloadChart data={workloadRows} />
      </div>
    </div>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
