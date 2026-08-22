"use client";

import { useNavigationProgress } from "@/components/navigation-progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Organization } from "@/lib/types";

// 슈퍼관리자 전용 "전체 부문" 선택지. 일반 관리자는 이미 자기 소속 부문 1건으로 고정돼
// 있어 이 필터 자체가 무의미하므로, app/protected/admin/divisions/page.tsx가 isSuperAdmin일
// 때만 이 컴포넌트를 렌더링한다(dashboard-filters.tsx의 부문 선택기와 동일한 노출 조건).
export const ALL_ORGANIZATIONS_FILTER = "all";

// 부서 관리 목록의 "소속 부문" 필터. 필터와 결과가 서로 다른 서버 컴포넌트인 화면이라
// NavigationProgressProvider(dashboard-filters.tsx와 동일 패턴)로 URL(?org=) soft
// navigation을 처리한다.
export function AdminDivisionFilters({
  organizations,
  currentOrgId,
}: {
  organizations: Pick<Organization, "id" | "name" | "archived_at">[];
  currentOrgId?: string;
}) {
  const { navigate } = useNavigationProgress();

  return (
    <Select
      value={currentOrgId ?? ALL_ORGANIZATIONS_FILTER}
      onValueChange={(value) => {
        const params = new URLSearchParams();
        if (value !== ALL_ORGANIZATIONS_FILTER) {
          params.set("org", value);
        }
        const query = params.toString();
        navigate(`/protected/admin/divisions${query ? `?${query}` : ""}`);
      }}
    >
      <SelectTrigger className="w-48" aria-label="부문 필터">
        <SelectValue placeholder="부문 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_ORGANIZATIONS_FILTER}>전체 부문</SelectItem>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.archived_at ? `${org.name} (비활성)` : org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
