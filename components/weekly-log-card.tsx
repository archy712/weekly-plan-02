import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WeeklyLogListItem } from "@/lib/types";

export function WeeklyLogCard({
  item,
  showDepartment = false,
}: {
  item: WeeklyLogListItem;
  showDepartment?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          <Link
            href={`/protected/weekly-logs/${item.id}`}
            className={cn(
              "hover:underline",
              item.is_completed && "italic line-through text-muted-foreground",
            )}
          >
            {item.title}
          </Link>
        </CardTitle>
        <StatusBadge isCompleted={item.is_completed} />
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        {showDepartment && <span>{item.department_name}</span>}
        <span>
          {formatDate(item.start_date)} ~ {formatDate(item.target_end_date)}
        </span>
      </CardContent>
    </Card>
  );
}

export function WeeklyLogCardList({
  items,
  showDepartment = false,
}: {
  items: WeeklyLogListItem[];
  showDepartment?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {items.map((item) => (
        <WeeklyLogCard key={item.id} item={item} showDepartment={showDepartment} />
      ))}
    </div>
  );
}
