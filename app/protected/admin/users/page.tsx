import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminUsersSkeleton } from "@/components/admin-users-skeleton";
import { UserAdminTable } from "@/components/user-admin-table";
import {
  countUsers,
  fetchUsersPage,
  getScopedDepartments,
  normalizeUserAdminFilters,
  normalizeUserAdminSort,
} from "@/lib/queries/user-admin";
import { USER_ADMIN_PAGE_SIZE } from "@/lib/types";
import type { Department } from "@/lib/types";

type AdminUsersSearchParams = {
  department?: string;
  role?: string;
  q?: string;
  sort?: string;
  dir?: string;
};

async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<AdminUsersSearchParams>;
}) {
  const supabase = await createClient();
  // 부서 게이트·관리자 확인은 app/protected/admin/layout.tsx의 requireAdmin()이 이미
  // 처리하지만, 이 페이지는 관리자 소속 조직으로 범위를 좁혀야 해서 organizationId·본인
  // id(자기 자신 강등 방지 UI에 필요)를 얻기 위해 다시 호출한다.
  const { id: currentUserId, organizationId, role: callerRole } = await requireAdmin();
  const isSuperAdmin = callerRole === "superadmin";

  const params = await searchParams;
  const filters = normalizeUserAdminFilters({
    department: params.department,
    role: params.role,
    q: params.q,
  });
  const sort = normalizeUserAdminSort({ key: params.sort, direction: params.dir });

  // 조직 스코프의 부서 목록(필터 드롭다운 + 사용자 목록 스코프)과 첫 배치(30건)를 조회한다.
  // 이후 배치는 클라이언트가 스크롤 시점에 loadMoreUsersAction으로 이어서 가져온다.
  const departments: Department[] = await getScopedDepartments(
    supabase,
    isSuperAdmin,
    organizationId,
  );
  const departmentIds = departments.map((department) => department.id);
  const [page, totalCount] = await Promise.all([
    fetchUsersPage(supabase, departmentIds, filters, sort, 0, USER_ADMIN_PAGE_SIZE),
    countUsers(supabase, departmentIds, filters),
  ]);

  return (
    <UserAdminTable
      initialItems={page.items}
      initialHasMore={page.hasMore}
      totalCount={totalCount}
      departments={departments}
      currentDepartmentId={filters.department}
      currentRole={filters.role}
      currentSearchQuery={filters.q}
      currentUserId={currentUserId}
      currentSortKey={sort.key}
      currentSortDirection={sort.direction}
    />
  );
}

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminUsersSearchParams>;
}) {
  return (
    <Suspense fallback={<AdminUsersSkeleton />}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}
