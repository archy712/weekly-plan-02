import { SelectItem, SelectSeparator } from "@/components/ui/select";
import type { Tables } from "@/lib/supabase/database.types";

type DepartmentOption = Pick<
  Tables<"departments">,
  "id" | "name" | "archived_at" | "division_id" | "is_direct_report"
>;

function renderDepartmentItem(department: DepartmentOption) {
  return (
    <SelectItem key={department.id} value={department.id}>
      {department.archived_at ? `${department.name} (비활성)` : department.name}
    </SelectItem>
  );
}

// 팀(department) Select의 선택지를 부문 직속 → 부서 직속 → 실제 팀 순으로 묶어 렌더링한다
// (components/profile-form.tsx, components/user-admin-detail.tsx가 공유). 부문장/부서장
// 후보가 실제 업무팀 수십 개 사이에서 자신이 지정된 "직속" 팀을 찾아야 하는 게 부자연스럽다는
// 사용자 피드백에 따라, 직속 팀을 상위에 고정 노출한다. 각 그룹이 비어 있으면 그 앞뒤
// 구분선도 함께 생략한다(빈 그룹 때문에 구분선만 덩그러니 남지 않도록).
export function DepartmentSelectOptions({ departments }: { departments: DepartmentOption[] }) {
  const organizationDirect = departments.filter(
    (department) => department.is_direct_report && !department.division_id,
  );
  const divisionDirect = departments.filter(
    (department) => department.is_direct_report && department.division_id,
  );
  const real = departments.filter((department) => !department.is_direct_report);

  return (
    <>
      {organizationDirect.map(renderDepartmentItem)}
      {organizationDirect.length > 0 && (divisionDirect.length > 0 || real.length > 0) && (
        <SelectSeparator />
      )}
      {divisionDirect.map(renderDepartmentItem)}
      {divisionDirect.length > 0 && real.length > 0 && <SelectSeparator />}
      {real.map(renderDepartmentItem)}
    </>
  );
}
