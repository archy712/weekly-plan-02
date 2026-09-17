"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, Repeat2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatRelativeTime, formatTransferPartyName } from "@/lib/format";
import type { WeeklyLogTransferItem } from "@/lib/types";

// 오너십 이관 이력(F063). 변경 이력 섹션(weekly-log-change-history.tsx)과 동일한 접이식
// 패턴을 쓰되 별도 섹션으로 둔다 — 이관은 "값 A → 값 B" 한 줄로 요약되는 속성 변경과 달리
// 담당자·소속 팀·이관 수행자·사유를 함께 읽어야 의미가 통하기 때문이다.
// 이 데이터 역시 클라이언트가 위조·수정할 수 없다(트리거 전용 기록, 쓰기 정책 없음).
export function WeeklyLogTransferHistorySection({
  transfers,
}: {
  transfers: WeeklyLogTransferItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="flex w-full items-center justify-between gap-2 rounded-none px-4 py-3 text-sm font-medium hover:bg-muted/50"
          aria-label={`이관 이력 ${open ? "접기" : "펼치기"}`}
        >
          <span className="flex items-center gap-2">
            <Repeat2 className="size-4" aria-hidden="true" />
            이관 이력{transfers.length > 0 ? ` (${transfers.length})` : ""}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-4 py-3">
        {transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 이관된 적이 없습니다.</p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto">
            {transfers.map((transfer) => {
              const from = formatTransferPartyName({
                name: transfer.from_name,
                email: transfer.from_email,
              });
              const to = formatTransferPartyName({
                name: transfer.to_name,
                email: transfer.to_email,
              });
              // 이관 수행자가 NULL인 경우(직접 DB 접속 등)는 변경 이력과 동일하게 "시스템".
              const actor = transfer.transferred_by_name ?? transfer.transferred_by_email ?? "시스템";
              const departmentMoved =
                transfer.from_department_id !== transfer.to_department_id &&
                transfer.to_department_name !== null;

              return (
                <li key={transfer.id} className="flex flex-col gap-0.5 text-sm">
                  <span className="flex flex-wrap items-center gap-1">
                    <span className="text-muted-foreground">{from}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">{to}</span>
                    {departmentMoved && (
                      <span className="text-muted-foreground">
                        ({transfer.from_department_name ?? "알 수 없음"} →{" "}
                        {transfer.to_department_name})
                      </span>
                    )}
                  </span>
                  {transfer.note && (
                    <span className="text-muted-foreground">사유: {transfer.note}</span>
                  )}
                  {/* formatRelativeTime()의 SSR/CSR 시간차로 인한 잠재적 텍스트 불일치 —
                      변경 이력 섹션과 동일한 이유로 suppressHydrationWarning. */}
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {actor}님이 이관 · {formatRelativeTime(transfer.created_at)}
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
