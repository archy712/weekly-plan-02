"use client";

import { useRouter } from "next/navigation";

import { DateRangeFilter } from "@/components/date-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type { Department, DepartmentFilter } from "@/lib/types";

// 대시보드 자체 필터(부서·기간). 목록 페이지(weekly-log-list-view.tsx)와 동일하게
// 클라이언트 상태가 아니라 URL(?department=&from=&to=)로 관리한다 — 서버 컴포넌트가
// searchParams를 읽어 4개 통계 RPC를 다시 조회하는 구조이므로, 필터가 바뀌면 페이지
// 전체가 서버에서 다시 렌더링되어야 모든 차트가 함께 갱신된다.
export function DashboardFilters({
  departments,
  currentDepartmentId,
  currentFrom,
  currentTo,
}: {
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentFrom?: string;
  currentTo?: string;
}) {
  const router = useRouter();

  const navigate = (overrides: {
    department?: string;
    from?: string | null;
    to?: string | null;
  }) => {
    const params = new URLSearchParams();
    params.set("department", overrides.department ?? currentDepartmentId);
    const from = overrides.from === null ? "" : (overrides.from ?? currentFrom ?? "");
    const to = overrides.to === null ? "" : (overrides.to ?? currentTo ?? "");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/protected/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={currentDepartmentId}
        onValueChange={(value) => navigate({ department: value })}
      >
        <SelectTrigger className="w-48" aria-label="부서 필터">
          <SelectValue placeholder="부서 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_DEPARTMENTS_FILTER}>전체 부서</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.archived_at ? `${dept.name} (비활성)` : dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DateRangeFilter
        from={currentFrom}
        to={currentTo}
        onFromChange={(value) => navigate({ from: value || null })}
        onToChange={(value) => navigate({ to: value || null })}
        onReset={() => navigate({ from: null, to: null })}
        onPreset={(range) => navigate(range)}
      />
    </div>
  );
}
