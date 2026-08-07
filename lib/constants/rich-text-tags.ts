// 에디터 툴바(components/html-editor.tsx)가 만들어내는 태그만 허용한다.
// lib/sanitize-html.ts(브라우저)와 lib/sanitize-html-server.ts(서버) 양쪽이 이 상수를
// 공유해 허용 태그 목록이 어긋나지 않도록 한다.
export const ALLOWED_TAGS = [
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

export const ALLOWED_ATTR = ["href"];
