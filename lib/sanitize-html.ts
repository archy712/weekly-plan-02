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
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizeWeeklyLogContent(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
