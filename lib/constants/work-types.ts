// 주간업무일지 "업무 타입" 속성. status(예정/진행중/완료)와 달리 영문 코드 없이 한글 값
// 자체를 DB 컬럼(weekly_logs.work_type)에 그대로 저장한다 — departments.name과 동일한 관례.
// 항목을 추가/제거하면 DB CHECK 제약(weekly_logs_work_type_check)과
// stats_logs_by_work_type() RPC의 고정 목록도 함께 수정해야 한다.
// 선택 화면(components/weekly-log-form.tsx)에 그대로 노출되는 순서라 가나다순으로 정렬해
// 둔다 — 값을 추가할 때도 이 순서를 유지할 것.
export const WORK_TYPE_OPTIONS = [
  "네트워크",
  "데이터 추출",
  "보고서 작성",
  "보안",
  "사업계획수립",
  "솔루션 도입",
  "시스템 개발",
  "시스템 검토",
  "클라우드",
  "프로젝트 개발",
] as const;

export type WeeklyLogWorkType = (typeof WORK_TYPE_OPTIONS)[number];
