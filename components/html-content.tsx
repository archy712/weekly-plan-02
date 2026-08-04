import { cn } from "@/lib/utils";
import { sanitizeWeeklyLogContent } from "@/lib/sanitize-html";

// 에디터(components/html-editor.tsx)와 상세보기가 동일한 결과물을 보여주도록 공유하는 스타일.
export const PROSE_CONTENT_CLASS = cn(
  "whitespace-pre-wrap text-sm leading-relaxed",
  "[&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold",
  "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
);

export function HtmlContent({
  html,
  emptyFallback,
  className,
}: {
  html: string;
  emptyFallback?: string;
  className?: string;
}) {
  const sanitized = sanitizeWeeklyLogContent(html);

  return (
    <div
      className={cn(PROSE_CONTENT_CLASS, className)}
      dangerouslySetInnerHTML={{
        __html:
          sanitized ||
          (emptyFallback ? `<p class="text-muted-foreground">${emptyFallback}</p>` : ""),
      }}
    />
  );
}
