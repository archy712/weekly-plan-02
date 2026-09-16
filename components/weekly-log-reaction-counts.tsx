import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// 목록(테이블/카드)에서 제목 옆에 노출하는 읽기 전용 추천/비추천 집계(F031). 상호작용은
// 상세 페이지의 WeeklyLogReactionButtons에서만 가능하므로 여기서는 아이콘+건수만 보여준다.
// 둘 다 0이면 아무것도 렌더링하지 않는다(댓글수 배지와 동일한 조건부 노출).
//
// 상세 페이지 버튼과 같은 안내를 툴팁으로 붙인다 — 목록은 행마다 반복되는 자리라 문구를
// 그대로 늘어놓으면 소음이 되고, 무엇보다 여기서는 누를 수 없으므로 "한 번만 누를 수
// 있어요" 대신 어디서 누를 수 있는지를 알려주는 문장으로 바꿨다. 툴팁은 마우스 hover
// 전용이라(터치·키보드에서는 뜨지 않음) 보조 설명으로만 쓰고, 건수 자체는 기존 aria-label로
// 계속 읽힌다.
const REACTION_HINT = "응원은 추천 👍, 아쉬우면 비추천 👎 — 상세 화면에서 누를 수 있어요";

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
    <Tooltip>
      <TooltipTrigger asChild>
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
      </TooltipTrigger>
      <TooltipContent>{REACTION_HINT}</TooltipContent>
    </Tooltip>
  );
}
