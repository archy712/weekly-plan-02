import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WeeklyLogListItem } from "@/lib/types";

export function WeeklyLogTable({
  items,
  showDepartment = false,
}: {
  items: WeeklyLogListItem[];
  showDepartment?: boolean;
}) {
  return (
    <div className="hidden md:block overflow-hidden rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-11 pl-4 text-sm font-bold tracking-wide text-foreground uppercase">
              제목
            </TableHead>
            {showDepartment && (
              <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                부서
              </TableHead>
            )}
            <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
              시작일
            </TableHead>
            <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
              목표종료일
            </TableHead>
            <TableHead className="h-11 pr-4 text-right text-sm font-bold tracking-wide text-foreground uppercase">
              진행상태
            </TableHead>
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
