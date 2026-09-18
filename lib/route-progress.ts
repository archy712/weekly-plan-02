// 라우트 전환(링크 클릭 · router.push) 동안 화면 최상단에 전역 로딩 바를 켜고 끄는 최소
// 외부 스토어. 그리는 쪽은 components/route-progress.tsx의 RouteProgress 하나뿐이다.
//
// 필터가 쿼리파라미터만 바꾸는 soft navigation은 각 화면이 로컬 useTransition +
// LoadingBar로 이미 피드백을 준다(components/loading-bar.tsx, navigation-progress.tsx).
// 반면 **라우트 자체가 바뀌는 이동**은 대상 페이지의 loading.tsx / Suspense 스켈레톤이
// 뜨기 전까지(= RSC 페이로드를 기다리는 구간) 아무 반응이 없어 화면이 멈춘 것처럼 보인다.
// 그 공백을 메우는 것이 이 스토어의 유일한 역할이다.
//
// React state가 아니라 모듈 스코프 스토어인 이유:
// (1) 바를 켜는 쪽(문서 전역 클릭 리스너, 여러 컴포넌트의 router.push)과 그리는 쪽(루트
//     레이아웃)이 트리상 멀리 떨어져 있어 Context로 묶으면 루트 전체를 클라이언트
//     컴포넌트로 만들어야 한다.
// (2) 구독을 useSyncExternalStore로 처리하면 useEffect 안의 setState를 쓰지 않아도 되고
//     (react-hooks/set-state-in-effect 규칙), SSR/하이드레이션 시점에는 항상 "꺼짐"으로
//     고정된다 — hooks/use-weekly-log-draft.ts와 동일한 이유.
//
// 끄는 시점은 "URL이 실제로 바뀐 순간"이다. App Router는 전환이 커밋될 때 history를
// 갱신하므로 커밋 전(서버 응답 대기) 구간에만 바가 보이고, 커밋 직후에는 대상 라우트의
// 스켈레톤이 이어받는다. URL 변경에는 전용 이벤트가 없어 짧은 폴링으로 감지한다 — 활성
// 구간에만 타이머가 돌고 전환이 끝나면 즉시 정리된다(usePathname으로 감지하면 경로가
// 같고 쿼리만 다른 링크 이동을 놓친다).

const POLL_INTERVAL_MS = 100;
// 전환이 중간에 취소되는 등 URL이 끝까지 바뀌지 않는 경우에도 바가 영구히 남지 않게 하는
// 안전장치. 이 시간을 넘기면 조용히 끈다(에러 토스트 없음 — 보조 표시일 뿐이다).
const MAX_DURATION_MS = 20_000;

const listeners = new Set<() => void>();

let active = false;
let startedAt = 0;
let startedHref = "";
let pollTimer: ReturnType<typeof setInterval> | null = null;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function clearPollTimer() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** 라우트 전환을 시작할 때 호출한다(링크 클릭 감지 · router.push 직전). */
export function startRouteProgress() {
  if (typeof window === "undefined") return;

  // 연속 클릭은 마지막 이동을 기준으로 다시 잰다(첫 클릭의 URL이 남아 있으면 두 번째
  // 이동이 끝나도 바가 꺼지지 않는다).
  startedHref = window.location.href;
  startedAt = Date.now();

  if (!active) {
    active = true;
    emit();
  }

  if (pollTimer === null) {
    pollTimer = setInterval(() => {
      if (
        window.location.href !== startedHref ||
        Date.now() - startedAt > MAX_DURATION_MS
      ) {
        stopRouteProgress();
      }
    }, POLL_INTERVAL_MS);
  }
}

/** 전환이 끝났거나(URL 변경) 더 이상 기다릴 필요가 없을 때 바를 끈다. */
export function stopRouteProgress() {
  clearPollTimer();
  if (active) {
    active = false;
    emit();
  }
}

export function subscribeRouteProgress(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRouteProgressSnapshot() {
  return active;
}

// SSR·하이드레이션 시점에는 항상 꺼짐 — 서버에는 "진행 중인 전환"이라는 개념이 없다.
export function getRouteProgressServerSnapshot() {
  return false;
}
