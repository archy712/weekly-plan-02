import { Suspense } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getLogsByDepartment,
  getLogsByImportance,
  getLogsByStatus,
  getLogsByWorkType,
  getMonthlyTrend,
  getReactionsSummary,
  getWorkloadSummary,
} from "@/lib/queries/stats";
import { DASHBOARD_ALL_ORGANIZATIONS, DashboardFilters } from "@/components/dashboard-filters";
import { DimOnPending, NavigationProgressProvider } from "@/components/navigation-progress";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { DashboardSummaryCards } from "@/components/dashboard-summary-cards";
import { DashboardDepartmentChart } from "@/components/dashboard-department-chart";
import { DashboardStatusChart } from "@/components/dashboard-status-chart";
import { DashboardWorkTypeChart } from "@/components/dashboard-worktype-chart";
import { DashboardImportanceChart } from "@/components/dashboard-importance-chart";
import { DashboardReactionChart } from "@/components/dashboard-reaction-chart";
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
  org?: string;
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

  // 부서 게이트·관리자 확인은 app/protected/admin/layout.tsx의 requireAdmin()이 이미
  // 처리하지만, 이 페이지는 관리자 소속 조직으로 범위를 좁혀야 해서 organizationId를
  // 얻기 위해 다시 호출한다(약간의 중복 조회, CLAUDE.md의 페이지별 부서 게이트 반복
  // 관례와 동일한 트레이드오프).
  const { role, organizationId } = await requireAdmin();
  const isSuperAdmin = role === "superadmin";

  const {
    org: orgParam,
    department: departmentParam,
    from: fromParam,
    to: toParam,
  } = await searchParams;

  // F034: 슈퍼관리자만 조직 선택기를 볼 수 있다 — organizations가 undefined면
  // DashboardFilters가 선택기를 아예 렌더링하지 않는다. 일반 관리자는 항상 자기 소속
  // 조직으로 고정(기존 동작 그대로).
  let organizations: { id: string; name: string; archived_at: string | null }[] | undefined;
  let selectedOrgId: string | undefined = organizationId;
  if (isSuperAdmin) {
    const { data: organizationRows } = await supabase
      .from("organizations")
      .select("id, name, archived_at")
      .order("name");
    organizations = organizationRows ?? [];

    if (orgParam === DASHBOARD_ALL_ORGANIZATIONS) {
      selectedOrgId = undefined;
    } else if (orgParam && organizations.some((org) => org.id === orgParam)) {
      selectedOrgId = orgParam;
    } else if (!orgParam) {
      // 파라미터가 없는 최초 진입은 관리자와 동일하게 "내 조직"을 기본값으로 둔다.
      selectedOrgId = organizationId;
    } else {
      // 존재하지 않는 조직 id가 조작되어 들어온 경우 "전체 조직"으로 안전하게 폴백.
      selectedOrgId = undefined;
    }
  }

  const selectedDepartment: DepartmentFilter = departmentParam || ALL_DEPARTMENTS_FILTER;
  const departmentId =
    selectedDepartment === ALL_DEPARTMENTS_FILTER ? undefined : selectedDepartment;

  let fromDate = fromParam && dateParamSchema.safeParse(fromParam).success ? fromParam : undefined;
  let toDate = toParam && dateParamSchema.safeParse(toParam).success ? toParam : undefined;
  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }
  const range = { from: fromDate, to: toDate };

  // 부서 드롭다운도 선택된 조직 범위를 따른다 — "전체 조직" 선택 시 전 조직의 부서를
  // 모두 보여주고, 특정 조직 선택 시 그 조직의 부서만 보여준다.
  let departmentQuery = supabase
    .from("departments")
    .select("id, name, created_at, archived_at, organization_id, division_id, head_profile_id")
    .order("name");
  if (selectedOrgId) {
    departmentQuery = departmentQuery.eq("organization_id", selectedOrgId);
  }
  const { data: departmentRows } = await departmentQuery;
  const departments: Department[] = departmentRows ?? [];

  const [departmentStats, statusStats, workTypeStats, importanceStats, monthlyTrend, reactionStats] =
    await Promise.all([
      getLogsByDepartment(range, selectedOrgId),
      getLogsByStatus(range, departmentId, selectedOrgId),
      getLogsByWorkType(range, departmentId, selectedOrgId),
      getLogsByImportance(range, departmentId, selectedOrgId),
      getMonthlyTrend(TREND_MONTHS, departmentId, selectedOrgId),
      getReactionsSummary(range, departmentId, selectedOrgId),
    ]);

  // stats_workload_summary는 부서별 그룹화 없이 단일 행 요약만 반환하므로(Task 030),
  // "부서별" 비교 차트를 만들려면 부서마다 개별 호출해야 한다. departmentStats에 이미
  // 등장한 부서(=이 기간에 로그가 1건이라도 있는 부서)만 대상으로 삼아 불필요한 호출과
  // 0건짜리 빈 막대를 피한다.
  const workloadRows = await Promise.all(
    departmentStats.map(async (dept) => {
      const [summary] = await getWorkloadSummary(range, dept.department_id, selectedOrgId);
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
    <NavigationProgressProvider>
      <div className="flex flex-col gap-6">
        <DashboardFilters
          departments={departments}
          currentDepartmentId={selectedDepartment}
          currentFrom={fromDate}
          currentTo={toDate}
          organizations={organizations}
          currentOrgId={selectedOrgId}
        />
        <DimOnPending className="flex flex-col gap-6">
          <DashboardSummaryCards statusStats={statusStats} monthlyTrend={monthlyTrend} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardDepartmentChart data={departmentStats} />
            <DashboardStatusChart data={statusStats} />
            <DashboardWorkTypeChart data={workTypeStats} />
            <DashboardImportanceChart data={importanceStats} />
            <DashboardTrendChart data={monthlyTrend} />
            <DashboardReactionChart data={reactionStats} />
            <DashboardWorkloadChart data={workloadRows} />
          </div>
        </DimOnPending>
      </div>
    </NavigationProgressProvider>
  );
}

export default function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
