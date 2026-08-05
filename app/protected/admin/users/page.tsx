import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
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
  // 이 페이지는 app/protected/admin/layout.tsx의 requireAdmin() 가드를 이미 통과한
  // 뒤에만 렌더링되지만, 로그인 사용자 본인 id(자기 자신 강등 방지 UI에 필요)를 얻기
  // 위해 getClaims()를 다시 호출한다.
  const { data } = await supabase.auth.getClaims();
  const currentUserId = data?.claims?.sub ?? "";

  const { department: departmentParam, role: roleParam, q: rawQuery } = await searchParams;

  const selectedDepartment: DepartmentFilter = departmentParam || ALL_DEPARTMENTS_FILTER;
  const VALID_ROLES: UserRole[] = ["user", "admin"];
  const selectedRole: RoleFilter =
    roleParam && VALID_ROLES.includes(roleParam as UserRole)
      ? (roleParam as UserRole)
      : ALL_ROLES_FILTER;
  const searchQuery = rawQuery?.trim() ?? "";

  let usersQuery = supabase
    .from("profiles")
    .select(USERS_SELECT)
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

  const { data: departmentRows } = await supabase
    .from("departments")
    .select("id, name, created_at, archived_at")
    .order("name");
  const departments: Department[] = departmentRows ?? [];

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
