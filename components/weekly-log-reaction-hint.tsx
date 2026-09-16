import { Megaphone } from "lucide-react";

import { cn } from "@/lib/utils";

// 목록·칸반 상단에 한 줄로 고정되는 추천/비추천 안내. 처음에는 집계(WeeklyLogReactionCounts)에
// 툴팁으로 붙였지만 툴팁은 마우스 hover 전용이라 터치·키보드에서는 아예 뜨지 않아, 모바일
// 사용자에게도 보이도록 항상 노출되는 한 줄로 바꿨다(툴팁은 제거).
//
// 목록에서는 집계가 읽기 전용이라 상세 페이지 버튼의 "한 번만 누를 수 있어요" 대신 어디서
// 누를 수 있는지를 알려준다 — 문구를 바꾸려면 상세 페이지의
// components/weekly-log-reaction-buttons.tsx도 함께 볼 것(두 화면이 같은 어투를 쓴다).
export function WeeklyLogReactionHint({ className }: { className?: string }) {
  return (
    <p className={cn("text-muted-foreground flex items-center gap-1.5 text-xs", className)}>
      <Megaphone className="size-3.5 shrink-0" aria-hidden />
      응원은 추천 👍, 아쉬우면 비추천 👎 — 상세 화면에서 누를 수 있어요
    </p>
  );
}
