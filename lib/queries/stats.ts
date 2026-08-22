import { createClient } from "@/lib/supabase/server";
import type {
  DepartmentLogStats,
  DepartmentProgressStats,
  DivisionProgressStats,
  ImportanceLogStats,
  MonthlyLogTrend,
  MyWorkSummary,
  ReactionSummaryStats,
  StatsDateRange,
  StatusLogStats,
  WorkloadSummary,
  WorkTypeLogStats,
} from "@/lib/types/stats";

// Task 030: 통계 집계 RPC 조회 래퍼 (Server Component 전용).
//
// 4개 RPC(stats_logs_by_department/stats_logs_by_status/stats_logs_monthly_trend/
// stats_workload_summary)는 모두 SECURITY INVOKER로 작성되어 있어 weekly_logs의
// SELECT 정책(전 부서 공개)을 그대로 따른다 — 관리자든 일반 사용자든 동일한 결과를
// 받는다(CLAUDE.md 부서 기반 권한 모델 참고).
//
// 각 함수는 실패 시 예외를 던지지 않고 빈 배열로 폴백한다. 대시보드(Task 031)가 여러
// 차트를 동시에 그리는 구조라, 통계 위젯 하나의 RPC 실패가 페이지 전체를 죽이지 않게
// 하기 위함이다. 실패는 콘솔에 로그를 남겨 원인 추적은 가능하게 한다.
//
// organizationId는 관리자 콘솔 대시보드가 호출자의 소속 조직으로 결과를 제한하기 위해
// 모든 함수에 공통으로 전달한다(departmentId를 생략해 "전체 부서"를 선택해도 다른 조직의
// 부서/로그가 섞이지 않도록 하는 최종 방어선 — URL의 department 쿼리 파라미터가 다른
// 조직 부서로 조작되더라도 RPC가 organization_id 불일치 시 걸러낸다).
//
// divisionId(부문 아래 선택적 계층, CLAUDE.md "divisions 테이블" 절)도 동일한 이유로 모든
// 함수에 공통 전달한다 — departmentId 없이 "전체 팀"을 선택한 채 특정 부서(division)만
// 골랐을 때, 그 부서에 속한 팀의 로그만 집계되도록 하는 서버 사이드 필터다(마이그레이션
// extend_stats_rpc_division_scope, 대시보드 부서 필터가 dropdown만 좁히고 실제 차트는
// 여전히 조직 전체를 집계하던 버그 수정).

// Server Component에서 Fluid compute 대응을 위해 매 호출마다 새 클라이언트를 만든다
// (전역 변수에 저장하지 않음, CLAUDE.md 명시).

// 부서별 건수(상태별 분해 포함)
export async function getLogsByDepartment(
  range: StatsDateRange = {},
  organizationId?: string,
  divisionId?: string,
): Promise<DepartmentLogStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_logs_by_department", {
    from_date: range.from,
    to_date: range.to,
    org_id: organizationId,
    div_id: divisionId,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_logs_by_department 조회 실패:", error);
    return [];
  }

  return data ?? [];
}

// 진행상태(예정/진행중/완료) 분포. departmentId를 생략하면 전 부서 대상.
export async function getLogsByStatus(
  range: StatsDateRange = {},
  departmentId?: string,
  organizationId?: string,
  divisionId?: string,
): Promise<StatusLogStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_logs_by_status", {
    from_date: range.from,
    to_date: range.to,
    dept_id: departmentId,
    org_id: organizationId,
    div_id: divisionId,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_logs_by_status 조회 실패:", error);
    return [];
  }

  return (data ?? []) as StatusLogStats[];
}

// 타입(네트워크/클라우드/보안 등 8종)별 건수. departmentId를 생략하면 전 부서 대상.
export async function getLogsByWorkType(
  range: StatsDateRange = {},
  departmentId?: string,
  organizationId?: string,
  divisionId?: string,
): Promise<WorkTypeLogStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_logs_by_work_type", {
    from_date: range.from,
    to_date: range.to,
    dept_id: departmentId,
    org_id: organizationId,
    div_id: divisionId,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_logs_by_work_type 조회 실패:", error);
    return [];
  }

  return (data ?? []) as WorkTypeLogStats[];
}

// 업무 중요도(1~5단계) 분포. departmentId를 생략하면 전 부서 대상.
export async function getLogsByImportance(
  range: StatsDateRange = {},
  departmentId?: string,
  organizationId?: string,
  divisionId?: string,
): Promise<ImportanceLogStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_logs_by_importance", {
    from_date: range.from,
    to_date: range.to,
    dept_id: departmentId,
    org_id: organizationId,
    div_id: divisionId,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_logs_by_importance 조회 실패:", error);
    return [];
  }

  return (data ?? []) as ImportanceLogStats[];
}

// 최근 N개월(현재월 포함) 월별 신규 작성·완료 추이. departmentId를 생략하면 전 부서 대상.
export async function getMonthlyTrend(
  months: number = 6,
  departmentId?: string,
  organizationId?: string,
  divisionId?: string,
): Promise<MonthlyLogTrend[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_logs_monthly_trend", {
    months,
    dept_id: departmentId,
    org_id: organizationId,
    div_id: divisionId,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_logs_monthly_trend 조회 실패:", error);
    return [];
  }

  return data ?? [];
}

// 추천/비추천 익명 집계(F031). departmentId를 생략하면 전 부서 대상. 데이터가 0건인
// 반응도 항상 up/down 2행으로 반환된다(다른 stats_*와 동일).
export async function getReactionsSummary(
  range: StatsDateRange = {},
  departmentId?: string,
  organizationId?: string,
  divisionId?: string,
): Promise<ReactionSummaryStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_reactions_summary", {
    from_date: range.from,
    to_date: range.to,
    dept_id: departmentId,
    org_id: organizationId,
    div_id: divisionId,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_reactions_summary 조회 실패:", error);
    return [];
  }

  return (data ?? []) as ReactionSummaryStats[];
}

// 예상 M/M·예상 금액 합계 및 평균 소요 기간. 그룹화 없이 주어진 기간·부서 조건에 대한
// 단일 행 요약을 반환하므로(부서별 비교가 필요하면 departmentId를 바꿔가며 호출), 다른
// 조회 함수와의 시그니처 일관성을 위해 배열로 감싸 반환한다 — 성공 시 항상 정확히 1건.
export async function getWorkloadSummary(
  range: StatsDateRange = {},
  departmentId?: string,
  organizationId?: string,
  divisionId?: string,
): Promise<WorkloadSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_workload_summary", {
    from_date: range.from,
    to_date: range.to,
    dept_id: departmentId,
    org_id: organizationId,
    div_id: divisionId,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_workload_summary 조회 실패:", error);
    return [];
  }

  return data ?? [];
}

// 부문 선택 시 부서(division)별 진척률 파이 차트(ad hoc). todayIso는 stats_my_work_summary와
// 동일하게 호출부(Node의 new Date() 기준 KST, formatDate(new Date()))가 넘겨야 한다 —
// "지연" 판정 3중 일치 원칙(F040)과 같은 이유로 RPC 내부는 current_date를 참조하지 않는다.
// departmentId를 생략하면 조직/부서(division) 범위 전체 대상.
export async function getProgressByDivision(
  todayIso: string,
  range: StatsDateRange = {},
  departmentId?: string,
  organizationId?: string,
  divisionId?: string,
): Promise<DivisionProgressStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_progress_by_division", {
    today_param: todayIso,
    from_date: range.from,
    to_date: range.to,
    dept_id: departmentId,
    org_id: organizationId,
    div_id: divisionId,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_progress_by_division 조회 실패:", error);
    return [];
  }

  return data ?? [];
}

// 부문(또는 부서) 선택 시 팀(department)별 진척률 파이 차트(ad hoc). stats_logs_by_department와
// 동일한 이유로 departmentId 파라미터를 두지 않는다(그룹화 축 자체를 다시 좁히는 것은 의미가
// 없음 — 대시보드의 팀 선택이 이 차트에 영향을 주지 않는 것도 "부서별 건수" 차트와 동일한
// 기존 동작). divisionId를 넘기면 그 부서(division) 소속 팀만 대상으로 좁아진다.
export async function getProgressByDepartment(
  todayIso: string,
  range: StatsDateRange = {},
  organizationId?: string,
  divisionId?: string,
): Promise<DepartmentProgressStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_progress_by_department", {
    today_param: todayIso,
    from_date: range.from,
    to_date: range.to,
    org_id: organizationId,
    div_id: divisionId,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_progress_by_department 조회 실패:", error);
    return [];
  }

  return data ?? [];
}

// "내 업무" 개인 요약(Task 040/F040) — 지연/이번 주 마감/진행중 3개 지표를 왕복 1회로 조회.
// today_param은 칸반보드(app/protected/weekly-logs/kanban/page.tsx)와 동일하게 호출부가
// 서버 렌더링 시점의 Node 날짜(formatDate(new Date()))를 넘겨야 한다 — RPC 내부는
// current_date를 참조하지 않으므로 이 값이 두 화면의 "지연" 판정을 일치시키는 유일한 축이다.
// 위젯 하나의 RPC 실패가 목록 페이지 전체를 죽이면 안 되므로, 다른 stats_* 래퍼와 달리
// 빈 배열이 아니라 0으로 채운 단일 객체로 폴백한다(위젯이 "0건"으로 조용히 렌더링됨).
export async function getMyWorkSummary(
  authorId: string,
  todayIso: string,
): Promise<MyWorkSummary> {
  const fallback: MyWorkSummary = {
    overdue_count: 0,
    due_this_week_count: 0,
    in_progress_count: 0,
  };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stats_my_work_summary", {
    author_id_param: authorId,
    today_param: todayIso,
  });

  if (error) {
    console.error("[lib/queries/stats] stats_my_work_summary 조회 실패:", error);
    return fallback;
  }

  return data?.[0] ?? fallback;
}
