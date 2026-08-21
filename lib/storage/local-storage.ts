// localStorage 안전 접근 래퍼 — 이 프로젝트에서 브라우저 스토리지를 사용하는 최초의
// 지점(F042 임시저장)이라, 여기서 정한 규약이 이후 모든 localStorage 사용처(F045 필터
// 프리셋 등)의 표준이 된다.
//
// - 프라이빗 브라우징 모드, 스토리지 차단(브라우저 설정/확장 프로그램), 용량 초과(QuotaExceededError)
//   등으로 localStorage 접근 자체가 throw할 수 있으므로 모든 함수가 실패를 조용히 삼키고
//   null/false를 반환한다. 호출부는 이 값을 보고 "보조 기능이 비활성화됐다" 정도로만
//   처리하고, 에러 토스트로 사용자를 방해하지 않는다(v1 Task 035의 Realtime 폴백 판단과
//   동일한 원칙 — 보조 기능은 조용히 실패).
// - Next.js는 SSR/클라이언트 컴포넌트의 최초 렌더도 서버(Node)에서 한 번 수행하므로,
//   이 모듈은 `window`가 없는 환경에서도 평가될 수 있다. 그래서 모든 함수가 `typeof window`
//   가드를 갖고 있다 — 그럼에도 호출부는 반드시 `useEffect` 안에서만 이 함수들을 호출해야
//   한다(렌더 중 호출하면 서버·클라이언트 렌더 결과가 달라져 하이드레이션 불일치가 발생한다).

export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
