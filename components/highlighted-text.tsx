import { escapeRegExp } from "@/lib/utils";

// 서버 검색(lib/queries/weekly-logs.ts의 escapeLikePattern() + ilike '%...%')과 동일하게
// 대소문자 무시 부분 일치로 매칭한다. dangerouslySetInnerHTML을 쓰지 않고 React 노드(<mark>)
// 배열로 조립해 사용자 입력을 HTML로 해석하지 않는다(프로젝트의 sanitize·XSS 방어 관례).
export function HighlightedText({ text, query }: { text: string; query?: string }) {
  const trimmed = query?.trim();
  if (!trimmed) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, "gi"));
  const lowerTrimmed = trimmed.toLowerCase();

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === lowerTrimmed ? (
          <mark key={index} className="rounded-sm bg-warning/30 text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
