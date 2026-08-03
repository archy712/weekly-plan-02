"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
  currentDepartmentId,
  currentDepartmentName,
}: {
  items: WeeklyLogListItem[];
  departments: Department[];
  isAdmin: boolean;
  currentDepartmentId: DepartmentFilter;
  currentDepartmentName?: string | null;
}) {
  const router = useRouter();

  // 부서 필터는 클라이언트 상태가 아니라 URL(?department=)로 관리한다 — 서버 컴포넌트가
  // searchParams를 읽어 매번 다시 조회하므로, 관리자가 아니면 이 파라미터는 서버에서
  // 무시된다(UI 은닉만으로 방어하지 않음).
  const handleDepartmentChange = (value: string) => {
    const query = value === ALL_DEPARTMENTS_FILTER ? "" : `?department=${value}`;
    router.push(`/protected/weekly-logs${query}`);
  };

  const scopeLabel = isAdmin
    ? (currentDepartmentName ?? "전체")
    : (currentDepartmentName ?? "부서 미설정");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{scopeLabel}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isAdmin ? (
          <Select
            value={currentDepartmentId}
            onValueChange={handleDepartmentChange}
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
      {items.length === 0 ? (
        <EmptyState
          title="등록된 주간업무일지가 없습니다"
          description="신규 작성 버튼을 눌러 첫 업무일지를 작성해보세요."
        />
      ) : (
        <>
          <WeeklyLogTable items={items} showDepartment={isAdmin} />
          <WeeklyLogCardList items={items} showDepartment={isAdmin} />
        </>
      )}
    </div>
  );
}
