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
  getProgressByDepartment,
  getProgressByDivision,
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
  DashboardProgressChart,
  type ProgressGroupStats,
} from "@/components/dashboard-progress-chart";
import {
  DashboardWorkloadChart,
  type DepartmentWorkload,
} from "@/components/dashboard-workload-chart";
import { formatDate } from "@/lib/format";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type { Department, DepartmentFilter, Division } from "@/lib/types";

// 목록 페이지(app/protected/weekly-logs/page.tsx)와 동일한 방어: 형식이 올바르지 않은
// from/to는 500 크래시 대신 조용히 무시한다.
const dateParamSchema = z.string().date();

// 월별 추이 차트가 보여줄 기간(현재 달 포함 최근 N개월).
const TREND_MONTHS = 6;

type DashboardSearchParams = {
  org?: string;
  division?: string;
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
    division: divisionParam,
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
    .select("id, name, created_at, archived_at, organization_id, division_id, head_profile_id, is_direct_report")
    .order("name");
  if (selectedOrgId) {
    departmentQuery = departmentQuery.eq("organization_id", selectedOrgId);
  }
  const { data: departmentRows } = await departmentQuery;
  const departments: Department[] = departmentRows ?? [];

  // 부서(division) Select도 부문과 동일한 조직 범위를 따른다 — 위 "부서 관리" 화면
  // (app/protected/admin/divisions/page.tsx)과 동일한 스코프 쿼리 패턴. stats_* RPC에도
  // org_id/dept_id와 동일한 컨벤션으로 div_id가 추가되어 있어(마이그레이션
  // extend_stats_rpc_division_scope), 이 필터는 팀 Select의 선택지를 좁히는 것뿐 아니라
  // 실제 차트 데이터도 선택된 부서 범위로 제한한다.
  let divisionQuery = supabase
    .from("divisions")
    .select("id, name, created_at, archived_at, organization_id, head_profile_id")
    .order("name");
  if (selectedOrgId) {
    divisionQuery = divisionQuery.eq("organization_id", selectedOrgId);
  }
  const { data: divisionRows } = await divisionQuery;
  const divisions: Division[] = divisionRows ?? [];
  // 존재하지 않거나 선택된 조직 범위 밖의 division id가 URL에 조작되어 들어온 경우
  // "전체 부서"로 안전하게 폴백(위 조직 id 검증과 동일한 방어).
  const selectedDivisionId =
    divisionParam && divisions.some((division) => division.id === divisionParam)
      ? divisionParam
      : undefined;

  const todayIso = formatDate(new Date());

  // 부문/부서/팀 진척률 파이 차트(ad hoc) — 특정 부문이 선택된 경우에만 의미가 있다
  // ("전체 부문 합산"에서는 부서(division) 이름이 조직을 넘나들며 겹칠 수 있어 표시하지
  // 않는다). 부서(division)까지 선택된 경우 "부서별" 그리드는 어차피 division 1건짜리라
  // 굳이 보여줄 필요가 없어 생략하고 "팀별"만 그 부서 범위로 좁혀 보여준다.
  const showProgressCharts = selectedOrgId !== undefined;
  const showDivisionProgressChart = showProgressCharts && !selectedDivisionId && divisions.length > 0;

  const [
    departmentStats,
    statusStats,
    workTypeStats,
    importanceStats,
    monthlyTrend,
    reactionStats,
    divisionProgressStats,
    departmentProgressStats,
  ] = await Promise.all([
    getLogsByDepartment(range, selectedOrgId, selectedDivisionId),
    getLogsByStatus(range, departmentId, selectedOrgId, selectedDivisionId),
    getLogsByWorkType(range, departmentId, selectedOrgId, selectedDivisionId),
    getLogsByImportance(range, departmentId, selectedOrgId, selectedDivisionId),
    getMonthlyTrend(TREND_MONTHS, departmentId, selectedOrgId, selectedDivisionId),
    getReactionsSummary(range, departmentId, selectedOrgId, selectedDivisionId),
    showDivisionProgressChart
      ? getProgressByDivision(todayIso, range, departmentId, selectedOrgId)
      : Promise.resolve([]),
    showProgressCharts
      ? getProgressByDepartment(todayIso, range, selectedOrgId, selectedDivisionId)
      : Promise.resolve([]),
  ]);

  const divisionProgressRows: ProgressGroupStats[] = divisionProgressStats.map((row) => ({
    id: row.division_id,
    name: row.division_name,
    good_count: row.good_count,
    delayed_count: row.delayed_count,
    unregistered_count: row.unregistered_count,
    total_count: row.total_count,
  }));
  const departmentProgressRows: ProgressGroupStats[] = departmentProgressStats.map((row) => ({
    id: row.department_id,
    name: row.department_name,
    good_count: row.good_count,
    delayed_count: row.delayed_count,
    unregistered_count: row.unregistered_count,
    total_count: row.total_count,
  }));

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
          divisions={divisions}
          currentDivisionId={selectedDivisionId}
        />
        <DimOnPending className="flex flex-col gap-6">
          <DashboardSummaryCards statusStats={statusStats} monthlyTrend={monthlyTrend} />
          {showProgressCharts && (
            <div className="flex flex-col gap-6">
              {showDivisionProgressChart && (
                <DashboardProgressChart
                  title="부서별 진척률"
                  description="선택한 부문·기간 기준 부서(division)별 양호/지연/미등록 비율입니다."
                  rows={divisionProgressRows}
                  emptyDescription="선택한 부문·기간에 등록된 주간업무일지가 없습니다."
                />
              )}
              <DashboardProgressChart
                title="팀별 진척률"
                description="선택한 부문·기간 기준 팀별 양호/지연/미등록 비율입니다."
                rows={departmentProgressRows}
                emptyDescription="선택한 조건에 등록된 주간업무일지가 없습니다."
              />
            </div>
          )}
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
