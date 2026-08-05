import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { SortableTableHead, type SortDirection } from "@/components/sortable-table-head";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WeeklyLogListItem } from "@/lib/types";

export type WeeklyLogSortKey =
  | "title"
  | "department_name"
  | "start_date"
  | "target_end_date"
  | "status";
export type { SortDirection };

export function WeeklyLogTable({
  items,
  showDepartment = false,
  sortKey,
  sortDirection,
  onSort,
}: {
  items: WeeklyLogListItem[];
  showDepartment?: boolean;
  sortKey: WeeklyLogSortKey | null;
  sortDirection: SortDirection;
  onSort: (key: WeeklyLogSortKey) => void;
}) {
  return (
    <div className="hidden md:block overflow-hidden rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableTableHead
              label="제목"
              sortKey="title"
              currentSortKey={sortKey}
              currentDirection={sortDirection}
              onSort={onSort}
              className="pl-4"
            />
            {showDepartment && (
              <SortableTableHead
                label="부서"
                sortKey="department_name"
                currentSortKey={sortKey}
                currentDirection={sortDirection}
                onSort={onSort}
              />
            )}
            <SortableTableHead
              label="시작일"
              sortKey="start_date"
              currentSortKey={sortKey}
              currentDirection={sortDirection}
              onSort={onSort}
            />
            <SortableTableHead
              label="목표종료일"
              sortKey="target_end_date"
              currentSortKey={sortKey}
              currentDirection={sortDirection}
              onSort={onSort}
            />
            <SortableTableHead
              label="진행상태"
              sortKey="status"
              currentSortKey={sortKey}
              currentDirection={sortDirection}
              onSort={onSort}
              className="pr-4 text-right [&>button]:flex-row-reverse"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="group">
              <TableCell className="max-w-md py-3 pl-4 whitespace-normal font-medium">
                <Link
                  href={`/protected/weekly-logs/${item.id}`}
                  className={cn(
                    "group-hover:text-primary group-hover:underline",
                    item.status === "completed" && "italic line-through text-muted-foreground",
                  )}
                >
                  {item.title}
                  {item.comment_count > 0 && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({item.comment_count})
                    </span>
                  )}
                </Link>
              </TableCell>
              {showDepartment && (
                <TableCell className="py-3">
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {item.department_name}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="py-3 tabular-nums text-muted-foreground">
                {formatDate(item.start_date)}
              </TableCell>
              <TableCell className="py-3 tabular-nums text-muted-foreground">
                {formatDate(item.target_end_date)}
              </TableCell>
              <TableCell className="py-3 pr-4 text-right">
                <StatusBadge status={item.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
