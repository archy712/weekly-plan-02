"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleWeeklyLogReactionAction } from "@/lib/actions/weekly-log-reaction";
import type { WeeklyLogReactionKind, WeeklyLogReactionSummary } from "@/lib/types";

// 낙관적 업데이트용 로컬 계산. 서버 왕복 전에 화면을 먼저 갱신한다(진행상태·중요도 변경과
// 동일한 관례). 규칙은 서버 액션의 토글 규칙과 일치해야 한다:
//  - 같은 반응 재클릭 → 해제
//  - 반대 반응 클릭 → 전환(기존 반응 -1, 새 반응 +1)
//  - 반응 없음 → 새 반응 +1
function computeOptimistic(
  summary: WeeklyLogReactionSummary,
  kind: WeeklyLogReactionKind,
): WeeklyLogReactionSummary {
  let { up, down } = summary;
  // 먼저 기존 내 반응을 제거한다.
  if (summary.my_reaction === "up") up -= 1;
  if (summary.my_reaction === "down") down -= 1;

  let myReaction: WeeklyLogReactionKind | null;
  if (summary.my_reaction === kind) {
    // 같은 버튼 재클릭 → 해제(위에서 이미 제거됨).
    myReaction = null;
  } else {
    // 신규 또는 전환 → 누른 반응 +1.
    if (kind === "up") up += 1;
    else down += 1;
    myReaction = kind;
  }

  return { up: Math.max(0, up), down: Math.max(0, down), my_reaction: myReaction };
}

// F031 추천/비추천 버튼. 부서와 무관하게 로그인한 모든 사용자에게 노출된다(canWrite 게이트
// 없음) — weekly_logs가 전 부서 SELECT 공개이고 반응도 부서 무관이기 때문. 아이콘 전용
// 버튼이라 aria-label로 "추천 N건" 형태의 접근성 이름을 부여한다.
export function WeeklyLogReactionButtons({
  weeklyLogId,
  initialSummary,
}: {
  weeklyLogId: string;
  initialSummary: WeeklyLogReactionSummary;
}) {
  const [summary, setSummary] = useState<WeeklyLogReactionSummary>(initialSummary);
  const [isPending, setIsPending] = useState(false);

  const handleClick = async (kind: WeeklyLogReactionKind) => {
    if (isPending) return;
    const previous = summary;
    setSummary(computeOptimistic(previous, kind));
    setIsPending(true);
    try {
      const result = await toggleWeeklyLogReactionAction(weeklyLogId, kind);
      if (!result.success) {
        setSummary(previous);
        toast.error(result.error);
        return;
      }
      // 서버 재집계 결과로 확정한다 — 낙관값이 다른 사용자의 동시 반응과 어긋나 있어도
      // 서버 값이 진실이므로 여기서 맞춘다.
      setSummary(result.summary);
    } catch {
      setSummary(previous);
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={summary.my_reaction === "up" ? "default" : "outline"}
        size="sm"
        disabled={isPending}
        aria-pressed={summary.my_reaction === "up"}
        aria-label={`추천 ${summary.up}건${summary.my_reaction === "up" ? ", 내가 추천함" : ""}`}
        onClick={() => handleClick("up")}
      >
        <ThumbsUp className="size-4" />
        <span className="tabular-nums">{summary.up}</span>
      </Button>
      <Button
        type="button"
        variant={summary.my_reaction === "down" ? "default" : "outline"}
        size="sm"
        disabled={isPending}
        aria-pressed={summary.my_reaction === "down"}
        aria-label={`비추천 ${summary.down}건${summary.my_reaction === "down" ? ", 내가 비추천함" : ""}`}
        onClick={() => handleClick("down")}
      >
        <ThumbsDown className="size-4" />
        <span className="tabular-nums">{summary.down}</span>
      </Button>
    </div>
  );
}
