import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ilike 패턴(%, _)과 이스케이프 문자(\)를 리터럴로 취급하도록 이스케이프한다.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

// 정규식 메타문자를 이스케이프해 사용자 입력을 리터럴 문자열로 안전하게 정규식에 포함시킨다
// (F046 검색 결과 하이라이팅이 검색어를 매칭용 정규식으로 쓸 때 필요 — escapeLikePattern이
// ilike 패턴(%, _)을 다루는 것과 같은 문제가 정규식 쪽에서 반복된다).
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 한글 명사 뒤에 붙는 을/를 목적격 조사를 마지막 글자의 받침 유무로 정확히 고른다
// (F043 변경 이력 문구처럼 필드 라벨을 동적으로 조합할 때 필요 — "업무타입를"처럼 받침이
// 있는 단어에 "를"을 잘못 붙이는 실수를 막는다). 한글 완성형 범위(가~힣) 밖의 문자로
// 끝나면(영문/숫자 등) 받침 판정이 무의미하므로 "를"로 폴백한다.
export function getObjectParticle(word: string): "을" | "를" {
  const lastChar = word.trim().at(-1);
  if (!lastChar) return "를";
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "를";
  const hasFinalConsonant = (code - 0xac00) % 28 !== 0;
  return hasFinalConsonant ? "을" : "를";
}

// 숫자만 남기고 3-4-4자리로 끊어 "-"를 자동 삽입한다 (예: 01012345678 -> 010-1234-5678).
export function formatPhoneNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 숫자만 남기고 3자리마다 콤마(,)를 삽입한다 (예: 5000000 -> 5,000,000). 최대 15자리로 제한
// (기존 예상 소요 금액 검증 규칙과 동일한 상한).
export function formatThousandsInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 로컬 날짜(YYYY-MM-DD) 문자열로 변환한다. toISOString()은 UTC 기준이라 자정 근처에서
// 하루 밀리는 문제가 있어 getFullYear/getMonth/getDate로 직접 조합한다.
function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 기간 프리셋: 이번 주(월~일).
export function getThisWeekRange(base: Date = new Date()): { from: string; to: string } {
  const day = base.getDay(); // 0=일 ... 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toDateOnlyString(monday), to: toDateOnlyString(sunday) };
}

// 기간 프리셋: 이번 달(1일~말일).
export function getThisMonthRange(base: Date = new Date()): { from: string; to: string } {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { from: toDateOnlyString(first), to: toDateOnlyString(last) };
}

// 기간 프리셋: 최근 N개월(오늘 기준 N개월 전 같은 날짜 ~ 오늘).
export function getRecentMonthsRange(
  months: number,
  base: Date = new Date(),
): { from: string; to: string } {
  const from = new Date(base);
  from.setMonth(from.getMonth() - months);
  return { from: toDateOnlyString(from), to: toDateOnlyString(base) };
}

// "YYYY-MM-DD" 문자열을 로컬 타임존의 자정 Date로 파싱한다. new Date("YYYY-MM-DD")는 UTC
// 자정으로 해석돼 로컬 타임존이 UTC보다 빠르면(한국 등) 하루 전 날짜로 보일 수 있어
// (toDateOnlyString과 대칭되게) 연/월/일을 직접 분해해 로컬 Date를 구성한다.
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// 두 로컬 날짜(YYYY-MM-DD) 사이의 일수 차이(a - b). 타임라인 뷰(F047)가 막대의 가로
// 오프셋·길이를 계산하는 데 쓴다.
export function diffDays(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDateOnly(a).getTime() - parseDateOnly(b).getTime()) / msPerDay);
}

// 기준 날짜(YYYY-MM-DD)에 n일을 더한 로컬 날짜 문자열. 타임라인 뷰(F047)가 기간의 날짜 눈금을
// 계산하는 데 쓴다.
export function addDaysToDateString(value: string, days: number): string {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() + days);
  return toDateOnlyString(date);
}

// 목표진척률(%): 시작일~목표종료일 전체 기간 대비 오늘까지 지난 일수의 비율. 주간업무
// 상세 페이지가 사용자가 슬라이더로 입력한 실제 진척률과 비교해 지연 여부를 판단하는
// 기준값으로 쓴다(DB에 저장하지 않고 매 렌더링마다 계산). todayIso를 호출부에서 넘겨받는
// 이유는 F040 "내 업무" 위젯·칸반·타임라인의 지연 판정과 동일하다 — Postgres 세션
// 타임존이나 서버 로컬 시각이 아니라 항상 호출부(Node의 new Date())가 계산한 KST
// 기준으로 맞추기 위함. 100%를 넘기지 않도록 클램프하고, 시작일=종료일(당일 업무)이면
// 오늘이 그 날짜에 도달한 순간 100%로 취급한다.
export function computeTargetProgress(
  startDate: string,
  endDate: string,
  todayIso: string,
): number {
  const totalDays = diffDays(endDate, startDate);
  if (totalDays <= 0) return todayIso >= startDate ? 100 : 0;
  const elapsedDays = diffDays(todayIso, startDate);
  return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
}

// 리다이렉트 대상 경로를 신뢰하기 전에 오픈 리다이렉트를 막는다. "/"로 시작하지 않는
// 값(절대 URL, `@evil.com` 같은 userinfo 트릭 포함)이나 "//", "/\"로 시작하는 값
// (브라우저가 프로토콜 상대 URL로 해석해 외부 host로 이동시킬 수 있음)은 전부 거부하고
// fallback으로 대체한다 (구글 OAuth 콜백·이메일 인증 콜백의 next 쿼리 파라미터에 사용).
export function getSafeRedirectPath(value: string | null, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
