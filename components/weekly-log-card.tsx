import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { WeeklyLogReactionCounts } from "@/components/weekly-log-reaction-counts";
import { WeeklyLogTransferBadge } from "@/components/weekly-log-transfer-badge";
import { HighlightedText } from "@/components/highlighted-text";
import { formatDate, formatProgressLabel } from "@/lib/format";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { cn } from "@/lib/utils";
import type { WeeklyLogListItem } from "@/lib/types";

export function WeeklyLogCard({
  item,
  showAuthor = false,
  query,
}: {
  item: WeeklyLogListItem;
  showAuthor?: boolean;
  query?: string;
}) {
  // 표시 규칙(진행중은 0%도 표시, 예정 0%는 숨김, 완료는 항상 100%)은 목록 테이블·칸반
  // 카드·타임라인과 공유한다(lib/format.ts의 formatProgressLabel).
  const progressLabel = formatProgressLabel(item.status, item.progress);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
        <CardTitle className="text-base">
          <Link
            href={`/protected/weekly-logs/${item.id}`}
            className={cn(
              "hover:underline",
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
        </CardTitle>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={item.status} />
          {/* 배지와 같은 줄에 붙여, 카드마다 진척률 유무로 CardContent 줄 수가 달라지지
              않게 한다(목록 테이블과 동일한 원칙). span 자체는 항상 렌더링해 고정 폭을
              예약함으로써, 헤더가 justify-between이라 이 그룹의 폭이 바뀌면 배지가 좌우로
              밀리는 것을 막는다(테이블 진행상태 셀과 동일한 원칙). */}
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {progressLabel ?? ""}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 p-4 pt-0 text-sm text-muted-foreground">
        {showAuthor && (
          <div className="flex items-center gap-2">
            <Avatar size="sm" className={getAvatarPreset(item.author_avatar_key).bgClass}>
              <AvatarFallback className="bg-transparent text-xs">
                {getAvatarPreset(item.author_avatar_key).emoji}
              </AvatarFallback>
            </Avatar>
            <span>{item.author_name ?? item.author_email ?? "알 수 없는 사용자"}</span>
            <WeeklyLogTransferBadge count={item.transfer_count} />
          </div>
        )}
        <span>
          {formatDate(item.start_date)} ~ {formatDate(item.target_end_date)}
        </span>
        <WeeklyLogReactionCounts up={item.reaction_up_count} down={item.reaction_down_count} />
      </CardContent>
    </Card>
  );
}

export function WeeklyLogCardList({
  items,
  showAuthor = false,
  query,
}: {
  items: WeeklyLogListItem[];
  showAuthor?: boolean;
  query?: string;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {items.map((item) => (
        <WeeklyLogCard key={item.id} item={item} showAuthor={showAuthor} query={query} />
      ))}
    </div>
  );
}
