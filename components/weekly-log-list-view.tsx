"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { downloadWeeklyLogListPdf } from "@/lib/pdf/weekly-log-pdf";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  WeeklyLogListItem,
} from "@/lib/types";

export function WeeklyLogListView({
  items,
  departments,
  currentDepartmentId,
  currentDepartmentName,
}: {
  items: WeeklyLogListItem[];
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentDepartmentName?: string | null;
}) {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);

  // 부서 필터는 클라이언트 상태가 아니라 URL(?department=)로 관리한다 — 서버 컴포넌트가
  // searchParams를 읽어 매번 다시 조회한다. weekly_logs SELECT는 전 부서 공개이므로
  // 이 필터는 관리자 여부와 관계없이 누구나 사용할 수 있다.
  // "전체 부서"를 골랐을 때도 파라미터를 명시적으로 남겨야, 파라미터가 아예 없는
  // 최초 진입(기본값: admin은 전체, 일반 유저는 소속 부서)과 구분된다.
  const handleDepartmentChange = (value: string) => {
    router.push(`/protected/weekly-logs?department=${value}`);
  };

  const scopeLabel = currentDepartmentName ?? "전체 부서";

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadWeeklyLogListPdf({ items, departmentLabel: scopeLabel });
    } catch {
      toast.error("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{scopeLabel}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={currentDepartmentId}
          onValueChange={handleDepartmentChange}
        >
          <SelectTrigger className="w-48" aria-label="부서 필터">
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isDownloading}
            onClick={handleDownloadPdf}
          >
            {isDownloading ? "생성 중..." : "PDF 다운로드"}
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
          <WeeklyLogTable items={items} showDepartment />
          <WeeklyLogCardList items={items} showDepartment />
        </>
      )}
    </div>
  );
}
