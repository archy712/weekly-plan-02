import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import type { WeeklyLogListItem } from "@/lib/types";

export function WeeklyLogTable({
  items,
  showDepartment = false,
}: {
  items: WeeklyLogListItem[];
  showDepartment?: boolean;
}) {
  return (
    <div className="hidden md:block rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제목</TableHead>
            {showDepartment && <TableHead>부서</TableHead>}
            <TableHead>시작일</TableHead>
            <TableHead>목표종료일</TableHead>
            <TableHead className="text-right">완료상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-normal font-medium">
                <Link
                  href={`/protected/weekly-logs/${item.id}`}
                  className="hover:underline"
                >
                  {item.title}
                </Link>
              </TableCell>
              {showDepartment && <TableCell>{item.department_name}</TableCell>}
              <TableCell>{formatDate(item.start_date)}</TableCell>
              <TableCell>{formatDate(item.target_end_date)}</TableCell>
              <TableCell className="text-right">
                <StatusBadge isCompleted={item.is_completed} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
