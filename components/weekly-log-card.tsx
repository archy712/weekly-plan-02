import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { WeeklyLogReactionCounts } from "@/components/weekly-log-reaction-counts";
import { HighlightedText } from "@/components/highlighted-text";
import { formatDate } from "@/lib/format";
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
  // 완료된 업무는 실제 저장값과 무관하게 100%로 간주한다(상세 페이지의
  // displayProgress와 동일한 규칙, weekly-log-detail-view.tsx 참고).
  const displayProgress = item.status === "completed" ? 100 : item.progress;

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
          {/* 진척률이 입력된(0%에서 바뀐) 업무만 노출한다 — 0%는 "아직 입력 안 함"과
              구분할 수 없어(weekly-log-detail-view.tsx와 동일한 관례) 그냥 숨긴다. 배지와
              같은 줄에 붙여, 카드마다 진척률 유무로 CardContent 줄 수가 달라지지 않게 한다
              (목록 테이블과 동일한 원칙). span 자체는 항상 렌더링해 고정 폭을 예약함으로써,
              헤더가 justify-between이라 이 그룹의 폭이 바뀌면 배지가 좌우로 밀리는 것을
              막는다(테이블 진행상태 셀과 동일한 원칙). */}
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {displayProgress > 0 ? `${displayProgress}%` : ""}
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
