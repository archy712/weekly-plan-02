import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminUsersSkeleton } from "@/components/admin-users-skeleton";
import { UserAdminTable } from "@/components/user-admin-table";
import { escapeLikePattern } from "@/lib/utils";
import {
  ALL_DEPARTMENTS_FILTER,
  ALL_ROLES_FILTER,
} from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  RoleFilter,
  UserAdminListItem,
  UserRole,
} from "@/lib/types";

const USERS_SELECT =
  "id, email, name, department_id, role, avatar_key, created_at, departments(name)";

async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; role?: string; q?: string }>;
}) {
  const supabase = await createClient();
  // 부서 게이트·관리자 확인은 app/protected/admin/layout.tsx의 requireAdmin()이 이미
  // 처리하지만, 이 페이지는 관리자 소속 조직으로 범위를 좁혀야 해서 organizationId·본인
  // id(자기 자신 강등 방지 UI에 필요)를 얻기 위해 다시 호출한다.
  const { id: currentUserId, organizationId } = await requireAdmin();

  const { department: departmentParam, role: roleParam, q: rawQuery } = await searchParams;

  const selectedDepartment: DepartmentFilter = departmentParam || ALL_DEPARTMENTS_FILTER;
  const VALID_ROLES: UserRole[] = ["user", "admin"];
  const selectedRole: RoleFilter =
    roleParam && VALID_ROLES.includes(roleParam as UserRole)
      ? (roleParam as UserRole)
      : ALL_ROLES_FILTER;
  const searchQuery = rawQuery?.trim() ?? "";

  // 관리자 소속 조직의 부서만 필터 드롭다운과 사용자 목록 범위를 동시에 결정한다.
  const { data: departmentRows } = await supabase
    .from("departments")
    .select("id, name, created_at, archived_at, organization_id")
    .eq("organization_id", organizationId)
    .order("name");
  const departments: Department[] = departmentRows ?? [];
  const departmentIds = departments.map((department) => department.id);

  // 소속 조직에 부서가 하나도 없으면(현실적으로 드묾) in([]) 대신 빈 배열을 그대로 써서
  // "일치하는 행 없음"을 안전하게 표현한다.
  let usersQuery = supabase
    .from("profiles")
    .select(USERS_SELECT)
    .in("department_id", departmentIds)
    .order("email", { ascending: true });

  if (selectedDepartment !== ALL_DEPARTMENTS_FILTER) {
    usersQuery = usersQuery.eq("department_id", selectedDepartment);
  }
  if (selectedRole !== ALL_ROLES_FILTER) {
    usersQuery = usersQuery.eq("role", selectedRole);
  }
  if (searchQuery) {
    // 이메일 단일 컬럼 검색이라 weekly_logs 목록과 달리 .or() 병합이 필요 없다.
    // 그래도 검색어에 %/_/\가 섞이면 ilike 패턴이 깨지므로 동일하게 이스케이프한다.
    usersQuery = usersQuery.ilike("email", `%${escapeLikePattern(searchQuery)}%`);
  }

  const { data: userRows, error: usersError } = await usersQuery;
  if (usersError) {
    throw usersError;
  }

  const items: UserAdminListItem[] = (userRows ?? []).map((row) => ({
    id: row.id,
    email: row.email ?? "",
    name: row.name,
    department_id: row.department_id,
    department_name: row.departments?.name ?? null,
    role: (row.role as UserRole) ?? "user",
    avatar_key: row.avatar_key ?? "fox",
    created_at: row.created_at,
  }));

  return (
    <UserAdminTable
      items={items}
      departments={departments}
      currentDepartmentId={selectedDepartment}
      currentRole={selectedRole}
      currentSearchQuery={searchQuery}
      currentUserId={currentUserId}
    />
  );
}

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; role?: string; q?: string }>;
}) {
  return (
    <Suspense fallback={<AdminUsersSkeleton />}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}
