import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { WeeklyLogReactionCounts } from "@/components/weekly-log-reaction-counts";
import { formatDate } from "@/lib/format";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { cn } from "@/lib/utils";
import type { WeeklyLogListItem } from "@/lib/types";

export function WeeklyLogCard({
  item,
  showAuthor = false,
}: {
  item: WeeklyLogListItem;
  showAuthor?: boolean;
}) {
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
            {item.title}
            {item.comment_count > 0 && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({item.comment_count})
              </span>
            )}
          </Link>
        </CardTitle>
        <StatusBadge status={item.status} />
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
}: {
  items: WeeklyLogListItem[];
  showAuthor?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {items.map((item) => (
        <WeeklyLogCard key={item.id} item={item} showAuthor={showAuthor} />
      ))}
    </div>
  );
}
