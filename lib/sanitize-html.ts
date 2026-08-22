import DOMPurify from "dompurify";

import { ALLOWED_ATTR, ALLOWED_TAGS } from "@/lib/constants/rich-text-tags";

// 브라우저 전용 — components/html-editor.tsx(에디터 onChange)·components/html-content.tsx
// (읽기 전용 렌더링)에서만 쓴다. 서버 액션(lib/actions/weekly-log.ts 등)은 대신
// lib/sanitize-html-server.ts를 쓴다. 원래는 isomorphic-dompurify 하나로 양쪽을
// 커버했으나, 그 서버 경로가 의존하는 jsdom의 하위 의존성(html-encoding-sniffer →
// @exodus/bytes, 순수 ESM 패키지)을 Vercel 프로덕션 Turbopack 빌드의 external 모듈
// 로더가 require()로 읽지 못해(ERR_REQUIRE_ESM) 이 함수를 거치는 모든 Server Action이
// 500으로 죽는 것을 프로덕션에서 실측 확인해 분리했다. 하나의 파일에서 typeof window로
// 분기하는 방식도 시도했으나, Turbopack이 서버 전용 분기(sanitize-html, htmlparser2 등)를
// 클라이언트 번들에서 제거하지 못해(라우트당 +650KB 실측) 파일 자체를 분리하는 쪽으로
// 변경했다 — 이제 이 파일은 dompurify만 참조하므로 서버 쪽 라이브러리가 클라이언트
// 번들에 섞이지 않는다.
//
// 이 파일을 "use client" 컴포넌트가 import한다고 해서 브라우저에서만 실행되는 것은
// 아니다 — Next.js는 초기 HTML을 만들기 위해 클라이언트 컴포넌트도 서버(Node)에서
// 한 번 렌더링하므로, 이 모듈은 SSR 패스에서도 평가된다. 순수 브라우저용 dompurify
// 패키지는 window가 없으면 addHook/sanitize가 함수 자체가 아니라서(팩토리 패턴),
// 아래 typeof window 가드 없이 무조건 호출하면 "addHook is not a function"으로
// 모듈 평가 자체가 죽는다 — 이게 실제로 프로덕션에서 React #419(Suspense 경계가
// 서버 렌더링 중 오류로 완료되지 못해 클라이언트 렌더링으로 전환)를 일으킨 원인이었다.
// SSR 패스에서는 content가 이미 저장 시점에 sanitize-html-server.ts로 한 번
// sanitize된 값이므로, 그대로 통과시키고 하이드레이션 이후 클라이언트에서 dompurify로
// 다시 sanitize한다(이중 방어 중 두 번째 레이어가 하이드레이션 완료까지만 지연됨).
const isBrowser = typeof window !== "undefined";

if (isBrowser) {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

// 계약: SSR 패스(isBrowser=false)에서는 sanitize를 건너뛰고 원본을 그대로 반환한다 —
// 위 모듈 주석대로 이 함수는 "DB에서 읽어온, 저장 시점에 이미
// lib/sanitize-html-server.ts로 sanitize된 값"에만 호출해야 안전하다. 신뢰할 수 없는
// 원본 HTML(사용자가 방금 입력한 값 등)을 이 함수에 SSR 중 직접 넘기면 sanitize가 조용히
// 스킵된다 — 새 호출부를 추가할 때 이 전제가 성립하는지 반드시 확인할 것.
export function sanitizeWeeklyLogContent(html: string): string {
  if (!isBrowser) {
    return html;
  }
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
