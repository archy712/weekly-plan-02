"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  fetchUsersPage,
  getScopedDepartments,
  normalizeUserAdminFilters,
  normalizeUserAdminSort,
} from "@/lib/queries/user-admin";
import { USER_ADMIN_PAGE_SIZE } from "@/lib/types";
import type { UserAdminListItem } from "@/lib/types";

type RawFilters = {
  department?: string | null;
  role?: string | null;
  q?: string | null;
};

type RawSort = {
  key?: string | null;
  direction?: string | null;
};

export type LoadMoreUsersResult =
  | { success: true; items: UserAdminListItem[]; hasMore: boolean }
  | { success: false; error: string };

// 사용자 관리 목록 무한 스크롤 추가 로딩. profiles는 weekly_logs와 달리 조직 범위가 RLS가
// 아니라 쿼리(.in(department_id, ...))로 강제되므로, 클라이언트가 보낸 스코프를 신뢰하지 않고
// requireAdmin()으로 호출자를 재확인해 조직 범위를 서버에서 다시 계산한다(관리자 아니면
// requireAdmin 내부에서 리다이렉트).
export async function loadMoreUsersAction(params: {
  filters: RawFilters;
  sort: RawSort;
  offset: number;
}): Promise<LoadMoreUsersResult> {
  const { organizationId, role } = await requireAdmin();
  const isSuperAdmin = role === "superadmin";
  const supabase = await createClient();

  const offset = Number.isFinite(params.offset) ? Math.max(0, Math.floor(params.offset)) : 0;

  try {
    const departments = await getScopedDepartments(supabase, isSuperAdmin, organizationId);
    const departmentIds = departments.map((department) => department.id);
    const { items, hasMore } = await fetchUsersPage(
      supabase,
      departmentIds,
      normalizeUserAdminFilters(params.filters),
      normalizeUserAdminSort(params.sort),
      offset,
      USER_ADMIN_PAGE_SIZE,
    );
    return { success: true, items, hasMore };
  } catch (err) {
    console.error("[lib/actions/user-admin-list] 추가 로딩 실패:", err);
    return { success: false, error: "사용자 목록을 불러오지 못했습니다." };
  }
}
