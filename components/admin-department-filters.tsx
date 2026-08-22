"use client";

import { useNavigationProgress } from "@/components/navigation-progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Division, Organization } from "@/lib/types";

// 슈퍼관리자 전용 "전체 부문" 선택지. 일반 관리자는 자기 소속 부문 1건으로 고정돼 있어
// 이 필터 자체가 렌더링되지 않는다(app/protected/admin/departments/page.tsx가 isSuperAdmin일
// 때만 organizations를 넘김, dashboard-filters.tsx와 동일한 노출 조건).
export const ALL_ORGANIZATIONS_FILTER = "all";

// "전체 부서" 선택지. 부서가 없는 조직(팀이 부문에 바로 속함)에서는 이 필터 자체를
// 렌더링하지 않는다.
const ALL_DIVISIONS_FILTER = "all";

// 팀 관리 목록의 "소속 부문"·"소속 부서" 필터. 부문을 바꾸면 그 부문에 속하지 않는 부서
// 선택은 더 이상 유효하지 않으므로 "전체 부서"로 되돌린다(dashboard-filters.tsx의
// 부문→부서 캐스케이딩과 동일한 원칙).
export function AdminDepartmentFilters({
  organizations,
  currentOrgId,
  divisions,
  currentDivisionId,
}: {
  // 슈퍼관리자에게만 전달된다(일반 관리자는 undefined) — 부문 선택기 노출 여부를 결정.
  organizations?: Pick<Organization, "id" | "name" | "archived_at">[];
  currentOrgId?: string;
  // 선택된 부문(또는 전체 부문) 범위 안의 부서 목록. 비어 있으면 이 필터 자체를 렌더링하지
  // 않는다.
  divisions: Pick<Division, "id" | "name" | "archived_at">[];
  currentDivisionId?: string;
}) {
  const { navigate } = useNavigationProgress();
  const isSuperAdmin = organizations !== undefined;
  const hasDivisions = divisions.length > 0;

  const buildHref = (overrides: { org?: string; division?: string }) => {
    const params = new URLSearchParams();
    const orgChanged = overrides.org !== undefined && overrides.org !== currentOrgId;
    if (isSuperAdmin) {
      const org = overrides.org ?? currentOrgId ?? ALL_ORGANIZATIONS_FILTER;
      if (org !== ALL_ORGANIZATIONS_FILTER) params.set("org", org);
    }
    const division = orgChanged
      ? ALL_DIVISIONS_FILTER
      : (overrides.division ?? currentDivisionId ?? ALL_DIVISIONS_FILTER);
    if (division !== ALL_DIVISIONS_FILTER) params.set("division", division);
    const query = params.toString();
    return `/protected/admin/departments${query ? `?${query}` : ""}`;
  };

  return (
    <>
      {isSuperAdmin && (
        <Select
          value={currentOrgId ?? ALL_ORGANIZATIONS_FILTER}
          onValueChange={(value) => navigate(buildHref({ org: value }))}
        >
          <SelectTrigger className="w-48" aria-label="부문 필터">
            <SelectValue placeholder="부문 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ORGANIZATIONS_FILTER}>전체 부문</SelectItem>
            {organizations!.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.archived_at ? `${org.name} (비활성)` : org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {hasDivisions && (
        <Select
          value={currentDivisionId ?? ALL_DIVISIONS_FILTER}
          onValueChange={(value) => navigate(buildHref({ division: value }))}
        >
          <SelectTrigger className="w-48" aria-label="부서 필터">
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
    </>
  );
}
