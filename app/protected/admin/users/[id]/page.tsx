import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getScopedDepartments } from "@/lib/queries/user-admin";
import { AdminUserDetailSkeleton } from "@/components/admin-user-detail-skeleton";
import { UserAdminDetail } from "@/components/user-admin-detail";
import type {
  Department,
  UserAdminDetailData,
  UserAdminLogSummary,
  UserRole,
  WeeklyLogStatus,
} from "@/lib/types";

async function UserDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 잘못된 UUID를 그대로 쿼리하면 Postgres가 22P02(invalid input syntax)를 던져
  // 500으로 이어진다(MVP Task 014에서 실측된 사례와 동일). 존재하지 않는 id와
  // 동일하게 404로 처리한다.
  if (!z.string().uuid().safeParse(id).success) {
    notFound();
  }

  const supabase = await createClient();
  // 부서 게이트·관리자 확인은 app/protected/admin/layout.tsx의 requireAdmin()이 이미
  // 처리하지만, 이 페이지는 대상 사용자가 관리자 소속 조직에 속하는지 검증해야 해서
  // organizationId·본인 id를 얻기 위해 다시 호출한다(users/page.tsx와 동일 패턴).
  const { id: currentUserId, organizationId, role: callerRole } = await requireAdmin();
  const isSuperAdmin = callerRole === "superadmin";

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select(
      "id, email, name, department_id, role, avatar_key, phone_number, bio, created_at, departments:departments!profiles_department_id_fkey(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    throw targetError;
  }
  // profiles_select_own_or_admin 정책 덕분에 관리자는 전체를 조회할 수 있으므로,
  // null이면 id 자체가 존재하지 않는 경우다.
  if (!target) {
    notFound();
  }

  // 조직 범위 검증 — RLS(is_admin())는 조직과 무관하게 전체 profiles 조회를 허용하므로,
  // 다른 관리자 콘솔 화면(대시보드/부서/업무타입/사용자 목록)과 동일하게 이 페이지도
  // 쿼리 레벨에서 스코프를 직접 강제해야 한다. 사용자 목록(fetchUsersPage)이 이미
  // department_id가 스코프 밖(또는 null)인 사용자를 노출하지 않으므로, 상세 페이지도
  // 동일한 기준으로 접근을 막아 URL 직접 접근으로 타 조직 사용자 정보가 노출되지 않게 한다.
  const scopedDepartments: Department[] = await getScopedDepartments(
    supabase,
    isSuperAdmin,
    organizationId,
  );
  if (!target.department_id || !scopedDepartments.some((d) => d.id === target.department_id)) {
    notFound();
  }

  const user: UserAdminDetailData = {
    id: target.id,
    email: target.email ?? "",
    name: target.name,
    department_id: target.department_id,
    department_name: target.departments?.name ?? null,
    role: (target.role as UserRole) ?? "user",
    avatar_key: target.avatar_key ?? "fox",
    phone_number: target.phone_number,
    bio: target.bio,
    created_at: target.created_at,
  };

  // 총 건수/상태별 분포/최근 5건을 각각 쿼리하지 않고 이 사용자가 작성한 전체 행을
  // 한 번에 가져와 메모리에서 집계한다 — 사용자 1인당 로그 수가 적은 사내 도구
  // 규모(전체 167건/34명, 평균 5건 내외)라 이 방식이 왕복 횟수를 줄여 더 낫다.
  const { data: logRows, error: logsError } = await supabase
    .from("weekly_logs")
    .select("id, title, start_date, status")
    .eq("author_id", id)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (logsError) {
    throw logsError;
  }

  const statusCounts: Record<WeeklyLogStatus, number> = {
    planned: 0,
    in_progress: 0,
    completed: 0,
  };
  for (const row of logRows ?? []) {
    const status = row.status as WeeklyLogStatus;
    statusCounts[status] += 1;
  }

  const logSummary: UserAdminLogSummary = {
    totalCount: logRows?.length ?? 0,
    statusCounts,
    recent: (logRows ?? []).slice(0, 5).map((row) => ({
      id: row.id,
      title: row.title,
      start_date: row.start_date,
      status: row.status as WeeklyLogStatus,
    })),
  };

  // 소속 부서 변경 select — 위에서 이미 조직 범위로 좁혀 조회한 scopedDepartments를 그대로
  // 재사용한다(다른 조직의 부서가 select에 노출되던 문제 해결). 비활성 부서는 신규
  // 선택지에서 제외하되, 이미 그 부서에 속한 사용자에게는 현재 값이 계속 보이도록
  // 예외를 둔다(profile-form.tsx와 동일 관례).
  const departments: Department[] = scopedDepartments.filter(
    (department) => !department.archived_at || department.id === user.department_id,
  );

  return (
    <UserAdminDetail
      user={user}
      logSummary={logSummary}
      departments={departments}
      currentUserId={currentUserId}
    />
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<AdminUserDetailSkeleton />}>
      <UserDetailContent params={params} />
    </Suspense>
  );
}
