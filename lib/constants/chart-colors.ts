import type { WeeklyLogStatus } from "@/lib/types";

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

// 부서별 예상 M/M·금액 차트 색상. 두 지표는 스케일이 전혀 달라(M/M vs 원화 금액)
// 한 차트에 두 축으로 겹치지 않고 별도 차트로 분리했으므로, 색은 서로 구분되기만 하면
// 되어 --chart-1/--chart-2를 사용한다.
export const WORKLOAD_CHART_COLORS = {
  mm: "hsl(var(--chart-1))",
  cost: "hsl(var(--chart-2))",
} as const;

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

// 업무 중요도 분포(레이더) 차트 색상. 5개 축이 전부 같은 지표(건수)의 단일 계열이라
// 축마다 다른 색을 줄 필요가 없어 --chart-4 하나만 사용(부서별 M/M·금액 차트가 이미
// --chart-1/--chart-2를, 업무 타입 차트가 --chart-1~5를 순환 사용 중이라 시각적으로
// 구분되도록 선택).
export const IMPORTANCE_CHART_COLOR = "hsl(var(--chart-4))";
