"use client";

import { useState } from "react";
import { ChevronDown, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  formatChangeHistoryValue,
  formatRelativeTime,
  getChangeHistoryFieldLabel,
} from "@/lib/format";
import { getObjectParticle } from "@/lib/utils";
import type { WeeklyLogChangeHistoryItem } from "@/lib/types";

// 상세 페이지의 상태/업무타입/중요도 인라인 편집 이력(F043, 최소 버전). 기본 접힘 상태로
// 댓글 섹션 근처에 배치한다. 클라이언트는 이 데이터를 위조·수정할 수 없다(트리거 전용 기록,
// weekly_log_change_history에 쓰기 정책이 아예 없음 — CLAUDE.md 참고).
export function WeeklyLogChangeHistorySection({
  history,
}: {
  history: WeeklyLogChangeHistoryItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="flex w-full items-center justify-between gap-2 rounded-none px-4 py-3 text-sm font-medium hover:bg-muted/50"
          aria-label={`변경 이력 ${open ? "접기" : "펼치기"}`}
        >
          <span className="flex items-center gap-2">
            <History className="size-4" aria-hidden="true" />
            변경 이력{history.length > 0 ? ` (${history.length})` : ""}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-4 py-3">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 변경 이력이 없습니다.</p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto">
            {history.map((item) => {
              const actor = item.changed_by_name ?? item.changed_by_email ?? "시스템";
              const fieldLabel = getChangeHistoryFieldLabel(item.field);
              return (
                <li key={item.id} className="flex flex-col gap-0.5 text-sm">
                  <span>
                    <span className="font-medium">{actor}</span>님이{" "}
                    {fieldLabel}
                    {getObjectParticle(fieldLabel)}{" "}
                    <span className="text-muted-foreground">
                      {formatChangeHistoryValue(item.field, item.old_value)}
                    </span>
                    {" → "}
                    <span className="font-medium">
                      {formatChangeHistoryValue(item.field, item.new_value)}
                    </span>
                    (으)로 변경
                  </span>
                  {/* formatRelativeTime()의 SSR/CSR 시간차로 인한 잠재적 텍스트 불일치 —
                      weekly-log-comment-section.tsx와 동일한 이유로 suppressHydrationWarning. */}
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {formatRelativeTime(item.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
