// 주간업무일지 "업무 중요도" 속성. work_type과 달리 정수 1~5단계로 DB(weekly_logs.importance,
// smallint, CHECK 1~5)에 그대로 저장한다. 항목(범위·라벨)을 바꾸면 DB CHECK 제약과
// stats_logs_by_importance() RPC의 levels 목록도 함께 수정해야 한다.
export const IMPORTANCE_MIN = 1;
export const IMPORTANCE_MAX = 5;

export const IMPORTANCE_LEVELS = [1, 2, 3, 4, 5] as const;

export type WeeklyLogImportance = (typeof IMPORTANCE_LEVELS)[number];

export const IMPORTANCE_LABELS: Record<WeeklyLogImportance, string> = {
  1: "매우 낮음",
  2: "낮음",
  3: "보통",
  4: "높음",
  5: "매우 높음",
};

export const DEFAULT_IMPORTANCE: WeeklyLogImportance = 3;

// "매우 낮음 (1)" 형태 — 등록/상세 화면·차트에서 라벨 옆에 단계 숫자를 함께 표기할 때
// 공통으로 쓴다(문구를 여러 컴포넌트에서 중복 조합하지 않도록 단일화).
export function formatImportanceLabel(level: WeeklyLogImportance): string {
  return `${IMPORTANCE_LABELS[level]} (${level})`;
}
