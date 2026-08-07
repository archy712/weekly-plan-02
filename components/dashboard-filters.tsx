"use client";

import { useNavigationProgress } from "@/components/navigation-progress";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type { Department, DepartmentFilter, Organization } from "@/lib/types";

// F034: 슈퍼관리자 전용 "전체 조직 합산" 선택지. stats_* RPC는 org_id=NULL을 이미
// "조직 무관 전체 합산"으로 지원하므로(마이그레이션 변경 없이) 이 값을 만나면 페이지가
// organizationId를 undefined로 넘기기만 하면 된다. 일반 관리자에게는 organizations prop
// 자체를 넘기지 않아(=undefined) 이 선택지 자체가 렌더링되지 않는다.
export const DASHBOARD_ALL_ORGANIZATIONS = "all";

// 대시보드 자체 필터(조직·부서·기간). 목록 페이지(weekly-log-list-view.tsx)와 동일하게
// 클라이언트 상태가 아니라 URL(?org=&department=&from=&to=)로 관리한다 — 서버 컴포넌트가
// searchParams를 읽어 통계 RPC를 다시 조회하는 구조이므로, 필터가 바뀌면 페이지 전체가
// 서버에서 다시 렌더링되어야 모든 차트가 함께 갱신된다.
export function DashboardFilters({
  departments,
  currentDepartmentId,
  currentFrom,
  currentTo,
  organizations,
  currentOrgId,
}: {
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentFrom?: string;
  currentTo?: string;
  // 슈퍼관리자에게만 전달된다(일반 관리자는 undefined) — 조직 선택기 노출 여부를 결정.
  organizations?: Pick<Organization, "id" | "name" | "archived_at">[];
  currentOrgId?: string;
}) {
  // 필터 변경 중 상단 로딩 바 + 차트 dim을 위해 router.push 대신 Provider의 navigate를 쓴다
  // (NavigationProgressProvider가 transition을 소유, page.tsx에서 차트를 DimOnPending으로 감쌈).
  const { navigate: navigateWithProgress } = useNavigationProgress();
  const isSuperAdmin = organizations !== undefined;

  const navigate = (overrides: {
    org?: string;
    department?: string;
    from?: string | null;
    to?: string | null;
  }) => {
    const params = new URLSearchParams();
    // 조직을 바꾸면 이전 조직 기준으로 고른 부서 필터는 더 이상 유효하지 않을 수 있어
    // "전체 부서"로 되돌린다.
    const orgChanged = overrides.org !== undefined && overrides.org !== currentOrgId;
    params.set(
      "department",
      orgChanged ? ALL_DEPARTMENTS_FILTER : (overrides.department ?? currentDepartmentId),
    );
    if (isSuperAdmin) {
      params.set("org", overrides.org ?? currentOrgId ?? DASHBOARD_ALL_ORGANIZATIONS);
    }
    const from = overrides.from === null ? "" : (overrides.from ?? currentFrom ?? "");
    const to = overrides.to === null ? "" : (overrides.to ?? currentTo ?? "");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    navigateWithProgress(`/protected/admin/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isSuperAdmin && (
        <Select
          value={currentOrgId ?? DASHBOARD_ALL_ORGANIZATIONS}
          onValueChange={(value) => navigate({ org: value })}
        >
          <SelectTrigger className="w-48" aria-label="조직 필터">
            <SelectValue placeholder="조직 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DASHBOARD_ALL_ORGANIZATIONS}>전체 조직 합산</SelectItem>
            {organizations!.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.archived_at ? `${org.name} (비활성)` : org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
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
