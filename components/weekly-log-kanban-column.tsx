"use client";

import { useDroppable } from "@dnd-kit/core";

import { WeeklyLogKanbanCard } from "@/components/weekly-log-kanban-card";
import { Button } from "@/components/ui/button";
import { getStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WeeklyLogListItem, WeeklyLogStatus } from "@/lib/types";

// 뱃지(components/status-badge.tsx)와 동일한 진행상태별 색상 토큰을 컬럼 헤더 강조 바에도
// 재사용해, 카드의 상태 뱃지 색과 컬럼 색이 항상 일치하도록 한다.
const STATUS_ACCENT: Record<WeeklyLogStatus, string> = {
  planned: "border-t-warning",
  in_progress: "border-t-success",
  completed: "border-t-secondary-foreground/40",
};

export function WeeklyLogKanbanColumn({
  status,
  items,
  total,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onMoveStatus,
  currentUserDepartmentId,
  isAdmin,
  todayIso,
}: {
  status: WeeklyLogStatus;
  items: WeeklyLogListItem[];
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onMoveStatus: (item: WeeklyLogListItem, target: WeeklyLogStatus) => void;
  currentUserDepartmentId: string;
  isAdmin: boolean;
  todayIso: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col gap-3 rounded-lg border border-t-4 bg-muted/30 p-3",
        STATUS_ACCENT[status],
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{getStatusLabel(status)}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {items.length < total ? `${items.length} / ${total}` : total}건
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-md p-1 transition-colors",
          isOver && "bg-primary/10 outline-dashed outline-2 outline-primary/40",
        )}
      >
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            표시할 업무가 없습니다
          </p>
        ) : (
          items.map((item) => {
            const canWrite = isAdmin || item.department_id === currentUserDepartmentId;
            const overdue = status !== "completed" && item.target_end_date < todayIso;
            return (
              <WeeklyLogKanbanCard
                key={item.id}
                item={item}
                canWrite={canWrite}
                overdue={overdue}
                onMoveStatus={(target) => onMoveStatus(item, target)}
              />
            );
          })
        )}
        {hasMore && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "불러오는 중..." : "더 보기"}
          </Button>
        )}
      </div>
    </div>
  );
}
