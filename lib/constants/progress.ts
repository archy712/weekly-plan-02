// 주간업무일지 "진척률" 속성. 슬라이더 0~100(5 단위)로 사용자가 직접 입력해
// DB(weekly_logs.progress, smallint, CHECK 0~100, 기본값 0)에 그대로 저장한다.
// 범위/단위를 바꾸면 DB CHECK 제약도 함께 수정해야 한다. 비교 대상인 "목표진척률"은
// 저장하지 않고 매 요청 계산한다(lib/utils.ts의 computeTargetProgress() 참고).
export const PROGRESS_MIN = 0;
export const PROGRESS_MAX = 100;
export const PROGRESS_STEP = 5;
export const DEFAULT_PROGRESS = 0;
