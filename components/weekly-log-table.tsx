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
import { HighlightedText } from "@/components/highlighted-text";
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
  query,
}: {
  items: WeeklyLogListItem[];
  showAuthor?: boolean;
  sortKey: WeeklyLogSortKey | null;
  sortDirection: SortDirection;
  onSort: (key: WeeklyLogSortKey) => void;
  // F046 검색 결과 하이라이팅 — 제목 payload만 있어 제목에만 적용된다(목록 payload에
  // content가 없어 내용 스니펫은 표시하지 않음, F032 성능 개선과의 충돌 회피).
  query?: string;
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
                  <HighlightedText text={item.title} query={query} />
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
                <div className="flex items-center justify-end gap-1.5">
                  <StatusBadge status={item.status} />
                  {/* 진척률이 입력된(0%에서 바뀐) 업무만 노출한다 — 0%는 "아직 입력 안 함"과
                      구분할 수 없어(weekly-log-detail-view.tsx와 동일한 관례) 그냥 숨긴다.
                      완료된 업무는 실제 저장값과 무관하게 100%로 간주한다(displayProgress와
                      동일한 규칙). span 자체는 항상 렌더링해 고정 폭을 예약함으로써, 값이
                      있는 행과 없는 행 사이에서 배지 위치가 좌우로 엇갈리지 않게 한다
                      (justify-end라 퍼센트 유무에 따라 그룹 전체 폭이 바뀌면 배지가 밀림). */}
                  <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {(item.status === "completed" ? 100 : item.progress) > 0
                      ? `${item.status === "completed" ? 100 : item.progress}%`
                      : ""}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
