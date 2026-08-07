import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { WeeklyLogReactionCounts } from "@/components/weekly-log-reaction-counts";
import { SortableTableHead, type SortDirection } from "@/components/sortable-table-head";
import { formatDate } from "@/lib/format";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { cn } from "@/lib/utils";
import type { WeeklyLogListItem, WeeklyLogSortKey } from "@/lib/types";

export type { WeeklyLogSortKey, SortDirection };

export function WeeklyLogTable({
  items,
  showAuthor = false,
  sortKey,
  sortDirection,
  onSort,
}: {
  items: WeeklyLogListItem[];
  showAuthor?: boolean;
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
            {/* 작성자 이름은 weekly_logs 컬럼이 아니라 get_profile_identities RPC로만 조회돼
                DB ORDER BY로 정렬할 수 없으므로(증분 로딩은 서버 정렬만 사용) 정렬 불가
                일반 헤더로 둔다. */}
            {showAuthor && (
              <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                작성자
              </TableHead>
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
                <WeeklyLogReactionCounts
                  up={item.reaction_up_count}
                  down={item.reaction_down_count}
                  className="ml-2 align-middle"
                />
              </TableCell>
              {showAuthor && (
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm" className={getAvatarPreset(item.author_avatar_key).bgClass}>
                      <AvatarFallback className="bg-transparent text-xs">
                        {getAvatarPreset(item.author_avatar_key).emoji}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">
                      {item.author_name ?? item.author_email ?? "알 수 없는 사용자"}
                    </span>
                  </div>
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
