import sanitizeHtml from "sanitize-html";

import { ALLOWED_TAGS } from "@/lib/constants/rich-text-tags";

// 서버(Node) 전용 — lib/actions/weekly-log.ts·lib/actions/weekly-log-comment.ts 등
// "use server" 액션에서만 쓴다. 클라이언트 컴포넌트는 대신 lib/sanitize-html.ts(dompurify)를
// 쓴다 — 분리 이유는 lib/sanitize-html.ts 상단 주석 참고. 이 파일을 client component에서
// import하면 sanitize-html(htmlparser2 등)이 클라이언트 번들에 섞여 들어가니 주의할 것.

// sanitize-html의 transformTags 훅 — 모든 <a> 태그에 target="_blank"/
// rel="noopener noreferrer"를 강제한다(브라우저 쪽 dompurify의 afterSanitizeAttributes
// 훅과 동일한 효과).
function forceAnchorSafety(tagName: string, attribs: sanitizeHtml.Attributes) {
  return {
    tagName,
    attribs: {
      ...(attribs.href ? { href: attribs.href } : {}),
      target: "_blank",
      rel: "noopener noreferrer",
    },
  };
}

export function sanitizeWeeklyLogContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
    transformTags: { a: forceAnchorSafety },
  });
}

// 댓글은 Tiptap 리치 텍스트가 아니라 plain text로 저장한다 — weekly_logs.content처럼
// 일부 태그를 허용하는 것보다 태그를 전혀 허용하지 않는 편이 공격면이 작다는 판단
// (Task 032 결정). 렌더링 시에는 이 값을 그대로 텍스트로 출력해(React가 자동 이스케이프)
// 이중으로 방어한다.
export function sanitizeCommentContent(content: string): string {
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
}
