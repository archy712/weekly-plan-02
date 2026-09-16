import { ThumbsDown, ThumbsUp } from "lucide-react";

import { cn } from "@/lib/utils";

// 목록(테이블/카드)에서 제목 옆에 노출하는 읽기 전용 추천/비추천 집계(F031). 상호작용은
// 상세 페이지의 WeeklyLogReactionButtons에서만 가능하므로 여기서는 아이콘+건수만 보여준다.
// 둘 다 0이면 아무것도 렌더링하지 않는다(댓글수 배지와 동일한 조건부 노출).
export function WeeklyLogReactionCounts({
  up,
  down,
  className,
}: {
  up: number;
  down: number;
  className?: string;
}) {
  if (up === 0 && down === 0) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)}
    >
      <span className="inline-flex items-center gap-0.5" aria-label={`추천 ${up}건`}>
        <ThumbsUp className="size-3" aria-hidden />
        <span className="tabular-nums">{up}</span>
      </span>
      <span className="inline-flex items-center gap-0.5" aria-label={`비추천 ${down}건`}>
        <ThumbsDown className="size-3" aria-hidden />
        <span className="tabular-nums">{down}</span>
      </span>
    </span>
  );
}
