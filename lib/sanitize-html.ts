import DOMPurify from "isomorphic-dompurify";

// 에디터 툴바(components/html-editor.tsx)가 만들어내는 태그만 허용한다.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
];
const ALLOWED_ATTR = ["href"];

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizeWeeklyLogContent(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

// 댓글은 Tiptap 리치 텍스트가 아니라 plain text로 저장한다 — weekly_logs.content처럼
// 일부 태그를 허용하는 것보다 태그를 전혀 허용하지 않는 편이 공격면이 작다는 판단
// (Task 032 결정). 렌더링 시에는 이 값을 그대로 텍스트로 출력해(React가 자동 이스케이프)
// 이중으로 방어한다.
export function sanitizeCommentContent(content: string): string {
  return DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
