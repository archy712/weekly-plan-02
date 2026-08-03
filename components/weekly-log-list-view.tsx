"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeeklyLogTable } from "@/components/weekly-log-table";
import { WeeklyLogCardList } from "@/components/weekly-log-card";
import { EmptyState } from "@/components/empty-state";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  WeeklyLogListItem,
} from "@/lib/types";

export function WeeklyLogListView({
  items,
  departments,
  isAdmin,
}: {
  items: WeeklyLogListItem[];
  departments: Department[];
  isAdmin: boolean;
}) {
  const [department, setDepartment] = useState<DepartmentFilter>(
    ALL_DEPARTMENTS_FILTER,
  );

  const filteredItems = useMemo(() => {
    if (!isAdmin || department === ALL_DEPARTMENTS_FILTER) {
      return items;
    }
    return items.filter((item) => item.department_id === department);
  }, [items, isAdmin, department]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isAdmin ? (
          <Select
            value={department}
            onValueChange={(value) => setDepartment(value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="부서 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENTS_FILTER}>전체 부서</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled
            title="PDF 다운로드는 추후 지원 예정입니다"
          >
            PDF 다운로드
          </Button>
          <Button asChild>
            <Link href="/protected/weekly-logs/new">신규 작성</Link>
          </Button>
        </div>
      </div>
      {filteredItems.length === 0 ? (
        <EmptyState
          title="등록된 주간업무일지가 없습니다"
          description="신규 작성 버튼을 눌러 첫 업무일지를 작성해보세요."
        />
      ) : (
        <>
          <WeeklyLogTable items={filteredItems} showDepartment={isAdmin} />
          <WeeklyLogCardList items={filteredItems} showDepartment={isAdmin} />
        </>
      )}
    </div>
  );
}
