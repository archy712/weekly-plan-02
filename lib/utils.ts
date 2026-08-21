import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ilike 패턴(%, _)과 이스케이프 문자(\)를 리터럴로 취급하도록 이스케이프한다.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
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

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
