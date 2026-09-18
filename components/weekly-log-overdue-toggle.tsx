"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// "지연만 보기" 토글 — 목록·칸반·타임라인 세 뷰가 공유한다(진행상태 Select 옆).
//
// 지연은 **진행상태와 독립된 축**이다: "완료가 아니면서 목표종료일이 지난 업무"라 예정·
// 진행중 두 상태에 걸쳐 있어 status 필터로는 표현할 수 없고(status=in_progress로 근사하면
// planned 상태의 지연이 누락된다 — "내 업무" 위젯 주석의 실측 사례), 기간 필터로도 표현할
// 수 없다(과거를 포함하는 창을 잡으면 과거에 끝난 완료 업무가 같이 들어온다).
// 그래서 별도 토글이 필요하다. 판정 규칙은 서버(lib/queries/weekly-logs.ts의
// applyScalarFilters)에서 칸반 카드·타임라인 막대·"내 업무" 위젯과 문자 그대로 동일하게
// `status <> 'completed' AND target_end_date < 오늘`로 적용된다.
//
// 색은 칸반 카드·타임라인의 지연 표시(text-destructive + AlertTriangle)와 맞춘다 — 켜져
// 있을 때 destructive 버튼이 되어 "지금 지연만 보는 중"이 한눈에 보인다.
export function WeeklyLogOverdueToggle({
  active,
  clearsDateRange = false,
  onToggle,
}: {
  active: boolean;
  // 목록·칸반은 토글을 켤 때 기간 조건을 함께 해제한다(기간이 걸려 있으면 그 창 밖의 지연
  // 업무가 보이지 않아 토글이 무용지물이 된다). 타임라인은 기간 창이 필수라 해제할 수 없어
  // false로 두고, 그 차이를 툴팁 문구에 반영한다.
  clearsDateRange?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "destructive" : "outline"}
          aria-pressed={active}
          onClick={() => onToggle(!active)}
        >
          <AlertTriangle className="size-4" aria-hidden />
          지연만
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        완료되지 않은 채 목표종료일이 지난 업무만 봅니다(예정·진행중에 걸쳐 있어 진행상태
        필터로는 고를 수 없는 조건입니다).
        {clearsDateRange
          ? " 켜면 조회 기간 조건이 함께 해제됩니다 — 기간을 걸어두면 그 기간 밖의 지연 업무가 빠지기 때문입니다."
          : " 타임라인은 그려진 기간 안의 지연 업무만 표시합니다."}
      </TooltipContent>
    </Tooltip>
  );
}
