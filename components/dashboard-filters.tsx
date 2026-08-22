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
import type { Department, DepartmentFilter, Division, Organization } from "@/lib/types";

// F034: 슈퍼관리자 전용 "전체 조직 합산" 선택지. stats_* RPC는 org_id=NULL을 이미
// "조직 무관 전체 합산"으로 지원하므로(마이그레이션 변경 없이) 이 값을 만나면 페이지가
// organizationId를 undefined로 넘기기만 하면 된다. 일반 관리자에게는 organizations prop
// 자체를 넘기지 않아(=undefined) 이 선택지 자체가 렌더링되지 않는다.
export const DASHBOARD_ALL_ORGANIZATIONS = "all";

// 부문 아래 선택적으로 존재하는 부서(division) 필터의 "전체 부서" 선택지. stats_* RPC에도
// org_id/dept_id와 동일한 컨벤션으로 div_id가 추가되어 있어(마이그레이션
// extend_stats_rpc_division_scope), 부서를 선택하면 팀 Select의 선택지뿐 아니라 실제 차트
// 데이터도 그 부서에 속한 팀으로 제한된다. div_id는 실제 division uuid만 받을 수 있어
// (departments.division_id is null인 "부서 미배정 팀만" 같은 조건은 표현할 수 없다), 이
// 필터는 "부서 없음" 선택지 없이 실재하는 division만 나열한다.
const ALL_DIVISIONS_FILTER = "all";

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
  divisions,
  currentDivisionId,
}: {
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentFrom?: string;
  currentTo?: string;
  // 슈퍼관리자에게만 전달된다(일반 관리자는 undefined) — 조직 선택기 노출 여부를 결정.
  organizations?: Pick<Organization, "id" | "name" | "archived_at">[];
  currentOrgId?: string;
  // 선택된 부문(또는 전체 부문) 범위 안의 부서 목록. 부서가 하나도 없으면 이 필터 자체를
  // 렌더링하지 않는다 — 부문 바로 아래 팀이 있고 부서가 없는 조직에서는 불필요한 selectbox.
  divisions: Pick<Division, "id" | "name" | "archived_at">[];
  currentDivisionId?: string;
}) {
  // 필터 변경 중 상단 로딩 바 + 차트 dim을 위해 router.push 대신 Provider의 navigate를 쓴다
  // (NavigationProgressProvider가 transition을 소유, page.tsx에서 차트를 DimOnPending으로 감쌈).
  const { navigate: navigateWithProgress } = useNavigationProgress();
  const isSuperAdmin = organizations !== undefined;
  const hasDivisions = divisions.length > 0;
  const selectedDivisionId = currentDivisionId ?? ALL_DIVISIONS_FILTER;

  // 부서 선택 시 팀 Select의 선택지도 그 부서에 속한 팀만으로 좁힌다(department-form-dialog의
  // 부문→부서 캐스케이딩과 동일한 정신) — 실제 차트 데이터 필터링은 서버(page.tsx)가 div_id를
  // RPC에 전달해 처리하므로, 여기서는 이미 내려받은 departments 배열을 그대로 재사용한다.
  const departmentOptions =
    selectedDivisionId === ALL_DIVISIONS_FILTER
      ? departments
      : departments.filter((dept) => dept.division_id === selectedDivisionId);

  const navigate = (overrides: {
    org?: string;
    division?: string;
    department?: string;
    from?: string | null;
    to?: string | null;
  }) => {
    const params = new URLSearchParams();
    // 조직을 바꾸면 이전 조직 기준으로 고른 부서(division)·팀(department) 선택은 더 이상
    // 유효하지 않을 수 있어 각각 기본값으로 되돌린다. 부서만 바꿔도 팀 선택은 초기화한다.
    const orgChanged = overrides.org !== undefined && overrides.org !== currentOrgId;
    const divisionChanged =
      overrides.division !== undefined && overrides.division !== selectedDivisionId;
    params.set(
      "division",
      orgChanged ? ALL_DIVISIONS_FILTER : (overrides.division ?? selectedDivisionId),
    );
    params.set(
      "department",
      orgChanged || divisionChanged
        ? ALL_DEPARTMENTS_FILTER
        : (overrides.department ?? currentDepartmentId),
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
    // 목록/칸반 페이지의 필터 카드(weekly-log-list-view.tsx, weekly-log-kanban-view.tsx)와
    // 동일한 카드 컨테이너로 감싸 "필터 영역"이라는 동일 개념이 화면마다 다르게 보이지
    // 않게 통일한다. Select 폭도 동일하게 좁은 화면에서는 꽉 채우고(w-full) sm 이상에서만
    // 고정폭으로 되돌려, 375px 화면에서 옆으로 밀리지 않고 세로로 쌓이게 한다.
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
      {isSuperAdmin && (
        <Select
          value={currentOrgId ?? DASHBOARD_ALL_ORGANIZATIONS}
          onValueChange={(value) => navigate({ org: value })}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="부문 필터">
            <SelectValue placeholder="부문 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DASHBOARD_ALL_ORGANIZATIONS}>전체 부문 합산</SelectItem>
            {organizations!.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.archived_at ? `${org.name} (비활성)` : org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {hasDivisions && (
        <Select value={selectedDivisionId} onValueChange={(value) => navigate({ division: value })}>
          <SelectTrigger className="w-full sm:w-48" aria-label="부서 필터">
            <SelectValue placeholder="부서 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DIVISIONS_FILTER}>전체 부서</SelectItem>
            {divisions.map((division) => (
              <SelectItem key={division.id} value={division.id}>
                {division.archived_at ? `${division.name} (비활성)` : division.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        value={currentDepartmentId}
        onValueChange={(value) => navigate({ department: value })}
      >
        <SelectTrigger className="w-full sm:w-48" aria-label="팀 필터">
          <SelectValue placeholder="팀 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_DEPARTMENTS_FILTER}>전체 팀</SelectItem>
          {departmentOptions.map((dept) => (
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
