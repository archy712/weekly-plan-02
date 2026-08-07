import type { Database } from "@/lib/supabase/database.types";
import type {
  WeeklyLogImportance,
  WeeklyLogReactionKind,
  WeeklyLogStatus,
  WeeklyLogWorkType,
} from "@/lib/types";

// Task 030: 통계 집계 RPC(SECURITY INVOKER, lib/queries/stats.ts에서 호출)의 반환 타입.
// database.types.ts의 Functions 정의를 그대로 재사용해 RPC 시그니처가 바뀌면(재생성 시)
// 이 파일도 타입 에러로 즉시 드러나도록 한다(lib/types/index.ts가 Tables<>를 재노출하는
// 방식과 동일한 원칙).
type StatsFunctions = Database["public"]["Functions"];

// 부서별 건수(상태별 분해 포함) — stats_logs_by_department(from_date, to_date)
export type DepartmentLogStats =
  StatsFunctions["weeklyplan_stats_logs_by_department"]["Returns"][number];

// 진행상태 분포 — stats_logs_by_status(from_date, to_date, dept_id).
// DB 컬럼은 text이지만 CHECK 제약과 동일한 3개 값만 오므로 WeeklyLogStatus로 좁힌다.
export type StatusLogStats = Omit<
  StatsFunctions["weeklyplan_stats_logs_by_status"]["Returns"][number],
  "status"
> & { status: WeeklyLogStatus };

// 타입별 건수 — stats_logs_by_work_type(from_date, to_date, dept_id).
// 관리자가 work_types 테이블에서 관리하는 동적 목록이므로 값 개수가 고정되어 있지 않다
// (활성 상태인 것만 반환됨). WeeklyLogWorkType은 string 별칭이라 실질적으로 재노출용.
export type WorkTypeLogStats = Omit<
  StatsFunctions["weeklyplan_stats_logs_by_work_type"]["Returns"][number],
  "work_type"
> & { work_type: WeeklyLogWorkType };

// 업무 중요도 분포 — stats_logs_by_importance(from_date, to_date, dept_id).
// DB 컬럼은 smallint이지만 CHECK 제약과 동일한 1~5 값만 오므로 WeeklyLogImportance로 좁힌다.
export type ImportanceLogStats = Omit<
  StatsFunctions["weeklyplan_stats_logs_by_importance"]["Returns"][number],
  "importance"
> & { importance: WeeklyLogImportance };

// 월별 생성·완료 추이 — stats_logs_monthly_trend(months, dept_id).
// month는 각 달의 1일을 나타내는 date 문자열(YYYY-MM-DD)이다.
export type MonthlyLogTrend =
  StatsFunctions["weeklyplan_stats_logs_monthly_trend"]["Returns"][number];

// 업무량 요약 — stats_workload_summary(from_date, to_date, dept_id).
// mm_count/cost_count는 estimated_mm/estimated_cost가 실제로 입력된 건수(분모)이고,
// mm_sum/cost_sum은 그 값들의 합계(전부 NULL이면 0)다. avg_duration_days는 대상 로그가
// 0건이면 NULL — "0일"과 "데이터 없음"을 구분하기 위해 0으로 대체하지 않는다.
export type WorkloadSummary =
  StatsFunctions["weeklyplan_stats_workload_summary"]["Returns"][number];

// 추천/비추천 집계 — stats_reactions_summary(from_date, to_date, dept_id, org_id).
// DB 컬럼은 text이지만 CHECK 제약과 동일한 up/down 2개 값만 오므로 WeeklyLogReactionKind로
// 좁힌다. 데이터가 0건인 반응도 항상 2행으로 반환된다(다른 stats_*와 동일한 관례).
export type ReactionSummaryStats = Omit<
  StatsFunctions["weeklyplan_stats_reactions_summary"]["Returns"][number],
  "reaction"
> & { reaction: WeeklyLogReactionKind };

// 조회 함수 공통 기간 파라미터. from/to는 "YYYY-MM-DD" 형식(z.string().date() 검증을
// 거친 값)이며, 비워두면 해당 방향의 필터를 적용하지 않는다(app/protected/weekly-logs와
// 동일한 관례).
export type StatsDateRange = {
  from?: string;
  to?: string;
};
