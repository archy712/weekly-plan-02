import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

// 클릭 → 오름차순, 같은 헤더 재클릭 → 내림차순, 다른 헤더 클릭 → 그 헤더로 전환 후
// 오름차순부터 다시 시작하는 토글 정렬 헤더. 정렬 상태(sortKey/sortDirection)와 토글
// 핸들러(onSort)는 호출하는 쪽(예: weekly-log-list-view.tsx, user-admin-table.tsx)에서
// 관리하고, 이 컴포넌트는 헤더 렌더링과 클릭 이벤트 위임만 담당한다.
export function SortableTableHead<Key extends string>({
  label,
  sortKey,
  currentSortKey,
  currentDirection,
  onSort,
  className,
}: {
  label: string;
  sortKey: Key;
  currentSortKey: Key | null;
  currentDirection: SortDirection;
  onSort: (key: Key) => void;
  className?: string;
}) {
  const isActive = currentSortKey === sortKey;
  return (
    <TableHead
      className={cn("h-11 text-sm font-bold tracking-wide text-foreground uppercase", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-primary"
        aria-label={`${label} 기준 정렬${
          isActive ? `, 현재 ${currentDirection === "asc" ? "오름차순" : "내림차순"}` : ""
        }`}
      >
        {label}
        {isActive ? (
          currentDirection === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
        )}
      </button>
    </TableHead>
  );
}
