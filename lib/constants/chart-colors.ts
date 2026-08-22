import type { WeeklyLogProgressBucket, WeeklyLogStatus } from "@/lib/types";

// Task 031: 대시보드 차트 전용 색상 상수.
//
// 진행상태 색상은 기존 배지(components/status-badge.tsx)와 동일한 CSS 변수를 재사용해
// 배지 색상과 일관되게 매핑한다(planned=warning 주황 / in_progress=success 초록,
// MVP Task 020 관례). 단 completed는 배지에서 secondary(옅은 회색 배경 + 어두운 글자)
// 조합을 쓰지만, 차트 막대/파이 조각은 배경 없이 색 자체가 도형을 채워야 하므로
// --secondary(라이트 테마 기준 거의 흰색에 가까운 배경색)를 그대로 쓰면 카드 배경과
// 구분되지 않는다. 동일한 "회색" 계열이면서 실제로 눈에 보이는 --muted-foreground를
// 대신 사용한다.
export const STATUS_CHART_COLORS: Record<WeeklyLogStatus, string> = {
  planned: "hsl(var(--warning))",
  in_progress: "hsl(var(--success))",
  completed: "hsl(var(--muted-foreground))",
};

// 월별 추이 차트(생성 vs 완료) 색상. "완료"는 위 상태 색상과 동일한 색을 재사용해
// 의미를 통일하고, "생성"은 어느 상태와도 겹치지 않는 --chart-1(카테고리 색상 팔레트)을
// 사용한다.
export const TREND_CHART_COLORS = {
  created: "hsl(var(--chart-1))",
  completed: STATUS_CHART_COLORS.completed,
} as const;

// 부서별 예상 M/M·금액 차트 색상. 두 차트 모두 부서(막대)마다 서로 다른 색으로 구분되도록
// --chart-1~5 팔레트(5색)를 순서대로 반복(cycle)한다. 업무 타입 차트와 동일하게 Cell로
// 막대별 색을 개별 지정하며(dashboard-workload-chart.tsx 참고), 부서가 5개를 넘으면 색이
// 순환된다.
export const WORKLOAD_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const;

// 업무 타입별 건수 차트 색상. 진행상태 도넛과 달리 업무 타입은 10종으로 --chart-1~5
// 팔레트(5색)보다 많아 1:1로 매핑할 수 없으므로, 5색을 순서대로 반복(cycle)해 인접한
// 막대끼리만 겹치지 않게 한다(Cell로 막대별 색을 개별 지정, dashboard-worktype-chart.tsx 참고).
export const WORK_TYPE_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const;

// 추천/비추천(F031) 차트 색상. 추천은 긍정 의미의 --success(진행중 상태와 같은 초록이지만
// 대시보드에서 두 차트가 나란히 놓이지 않아 혼동 우려가 낮음), 비추천은 부정 의미의
// --destructive를 사용해 의미와 색을 직관적으로 맞춘다.
export const REACTION_CHART_COLORS = {
  up: "hsl(var(--success))",
  down: "hsl(var(--destructive))",
} as const;

// 대시보드 부문/부서/팀 진척률 파이 차트(ad hoc) 색상. 양호/지연은 추천/비추천 차트와 동일한
// 의미 매핑(긍정=--success, 부정=--destructive)을 재사용하고, 미등록은 진행상태 도넛의
// completed와 동일하게 "눈에 보이는 회색"인 --muted-foreground를 쓴다.
export const PROGRESS_CHART_COLORS: Record<WeeklyLogProgressBucket, string> = {
  good: "hsl(var(--success))",
  delayed: "hsl(var(--destructive))",
  unregistered: "hsl(var(--muted-foreground))",
};

// 업무 중요도 분포 차트 색상. 1~5가 순서가 있는 척도라는 점을 색으로도 드러내기 위해
// 서로 다른 색을 나열하는 대신 --chart-4 하나의 명도(알파)만 낮음→높음 순으로 진하게
// 단계적으로 올린다(부서별 M/M·금액 차트가 이미 --chart-1/--chart-2를, 업무 타입 차트가
// --chart-1~5를 순환 사용 중이라 다른 색과 겹치지 않도록 --chart-4 유지). 라이트/다크
// 테마 전환에도 --chart-4 자체가 테마별로 다른 값이라 별도 분기 없이 자동으로 맞는다.
export const IMPORTANCE_CHART_COLORS = [
  "hsl(var(--chart-4) / 0.3)",
  "hsl(var(--chart-4) / 0.48)",
  "hsl(var(--chart-4) / 0.65)",
  "hsl(var(--chart-4) / 0.83)",
  "hsl(var(--chart-4) / 1)",
] as const;
