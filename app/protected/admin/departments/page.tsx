import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminDepartmentFilters, ALL_ORGANIZATIONS_FILTER } from "@/components/admin-department-filters";
import { AdminDepartmentsSkeleton } from "@/components/admin-departments-skeleton";
import { DimOnPending, NavigationProgressProvider } from "@/components/navigation-progress";
import { DepartmentCardList } from "@/components/department-card";
import { DepartmentFormDialog } from "@/components/department-form-dialog";
import { DepartmentRowActions } from "@/components/department-row-actions";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatHeadName } from "@/lib/format";
import type { HeadCandidate } from "@/lib/types";

type AdminDepartmentsSearchParams = {
  org?: string;
  division?: string;
};

async function DepartmentsContent({
  searchParams,
}: {
  searchParams: Promise<AdminDepartmentsSearchParams>;
}) {
  const supabase = await createClient();

  // 부서 게이트·관리자 확인은 app/protected/admin/layout.tsx의 requireAdmin()이 이미
  // 처리하지만, 이 페이지는 관리자 소속 조직으로 범위를 좁혀야 해서 organizationId를
  // 얻기 위해 다시 호출한다.
  const { role, organizationId } = await requireAdmin();
  const isSuperAdmin = role === "superadmin";

  // 일반 관리자는 자기 소속 조직 1건만(폼 선택지·비활성 라벨링에 모두 필요해 부서 조회와
  // 별도로 가져온다). 슈퍼관리자는 F034로 전 조직을 다룰 수 있어 조직 필터 없이 전체를
  // 가져온다 — 테이블의 "소속 조직" 컬럼이 이미 각 행을 구분해 보여준다.
  let organizationsQuery = supabase
    .from("organizations")
    .select("id, name, created_at, archived_at, head_profile_id");
  if (!isSuperAdmin) {
    organizationsQuery = organizationsQuery.eq("id", organizationId);
  }
  const { data: organizationRows, error: organizationsError } = await organizationsQuery.order(
    "name",
  );

  if (organizationsError) {
    throw organizationsError;
  }

  const organizations = organizationRows ?? [];

  // 목록 필터(?org=&division=). 부문 필터는 슈퍼관리자 전용(일반 관리자는 이미
  // organizationId로 고정돼 있어 이 필터가 렌더링되지 않으므로 항상 undefined).
  const params = await searchParams;
  const requestedOrgId = isSuperAdmin ? params.org : undefined;
  const selectedOrgId =
    requestedOrgId && requestedOrgId !== ALL_ORGANIZATIONS_FILTER &&
    organizations.some((org) => org.id === requestedOrgId)
      ? requestedOrgId
      : undefined;

  // 팀 추가/수정 다이얼로그의 "소속 부서" 선택지 — 목록 필터와 무관하게 관리자 소속 부문
  // 범위 전체가 필요하다(다이얼로그 자체가 내부에서 선택한 부문에 맞춰 다시 걸러 보여줌,
  // department-form-dialog.tsx 참고). 부서는 선택 사항이라 빈 목록도 허용한다.
  let allDivisionsQuery = supabase
    .from("divisions")
    .select("id, organization_id, name, archived_at, created_at, head_profile_id");
  if (!isSuperAdmin) {
    allDivisionsQuery = allDivisionsQuery.eq("organization_id", organizationId);
  }
  const { data: allDivisionRows, error: divisionsError } = await allDivisionsQuery.order("name");

  if (divisionsError) {
    throw divisionsError;
  }

  const allDivisions = allDivisionRows ?? [];

  // "소속 부서" 필터 드롭다운에 노출할 선택지는 목록 필터(부문)로 좁힌 범위만 보여준다
  // (선택된 부문이 없으면 관리자 범위 전체). dashboard-filters.tsx의 부문→부서 캐스케이딩과
  // 동일한 원칙.
  const divisionOptions = selectedOrgId
    ? allDivisions.filter((division) => division.organization_id === selectedOrgId)
    : allDivisions;
  const selectedDivisionId =
    params.division && divisionOptions.some((division) => division.id === params.division)
      ? params.division
      : undefined;

  let departmentsQuery = supabase
    .from("departments")
    .select(
      "id, name, created_at, archived_at, organization_id, division_id, head_profile_id, organizations:organizations(name), divisions:divisions(name), head_profile:profiles!departments_head_profile_id_fkey(id, name, email)",
    )
    .order("name");
  if (!isSuperAdmin) {
    departmentsQuery = departmentsQuery.eq("organization_id", organizationId);
  } else if (selectedOrgId) {
    departmentsQuery = departmentsQuery.eq("organization_id", selectedOrgId);
  }
  if (selectedDivisionId) {
    departmentsQuery = departmentsQuery.eq("division_id", selectedDivisionId);
  }
  const { data: departmentRows, error: departmentsError } = await departmentsQuery;

  if (departmentsError) {
    throw departmentsError;
  }

  const departments = (departmentRows ?? []).map((department) => ({
    id: department.id,
    name: department.name,
    created_at: department.created_at,
    archived_at: department.archived_at,
    organization_id: department.organization_id,
    organization_name: department.organizations?.name ?? "",
    division_id: department.division_id,
    division_name: department.divisions?.name ?? null,
    head_profile_id: department.head_profile_id,
    head_name: department.head_profile?.name ?? null,
    head_email: department.head_profile?.email ?? null,
  }));

  // 팀장 선택지(=이 팀의 팀원)는 팀별로 갈라야 해서, 스코프 내 전 팀원을 한 번에 조회한 뒤
  // department_id로 그룹핑한다(부서별 N개 쿼리 대신 1개 쿼리 + 클라이언트 그룹핑).
  const departmentIds = departments.map((department) => department.id);
  const { data: memberRows, error: membersError } =
    departmentIds.length === 0
      ? { data: [] as { id: string; name: string | null; email: string | null; department_id: string | null }[], error: null }
      : await supabase
          .from("profiles")
          .select("id, name, email, department_id")
          .in("department_id", departmentIds);

  if (membersError) {
    throw membersError;
  }

  const headCandidatesByDepartment = new Map<string, HeadCandidate[]>();
  const memberCountByDepartment = new Map<string, number>();
  for (const member of memberRows ?? []) {
    if (!member.department_id) continue;
    const candidates = headCandidatesByDepartment.get(member.department_id) ?? [];
    candidates.push({ id: member.id, name: member.name, email: member.email });
    headCandidatesByDepartment.set(member.department_id, candidates);
    memberCountByDepartment.set(
      member.department_id,
      (memberCountByDepartment.get(member.department_id) ?? 0) + 1,
    );
  }

  // 업무일지 수는 삭제 가능 여부를 사용자가 미리 알 수 있게 하기 위한 것이라 부서별로
  // count 집계 쿼리를 병렬로 실행한다(부서 수가 적은 사내 도구 특성상 N건의 count-only
  // 쿼리로도 충분히 빠르다).
  const logCounts = await Promise.all(
    departments.map(async (department) => {
      const { count: logCount } = await supabase
        .from("weekly_logs")
        .select("id", { count: "exact", head: true })
        .eq("department_id", department.id);
      return { id: department.id, logCount: logCount ?? 0 };
    }),
  );
  const countMap = new Map(
    logCounts.map((entry) => [
      entry.id,
      { memberCount: memberCountByDepartment.get(entry.id) ?? 0, logCount: entry.logCount },
    ]),
  );

  return (
    <NavigationProgressProvider>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <AdminDepartmentFilters
              organizations={isSuperAdmin ? organizations : undefined}
              currentOrgId={selectedOrgId}
              divisions={divisionOptions}
              currentDivisionId={selectedDivisionId}
            />
          </div>
          <DepartmentFormDialog
            mode="create"
            organizations={organizations}
            divisions={allDivisions}
            trigger={<Button>팀 추가</Button>}
          />
        </div>
        <DimOnPending className="flex flex-col gap-4">
          {departments.length === 0 ? (
            <EmptyState
              title="등록된 팀이 없습니다"
              description="팀 추가 버튼을 눌러 첫 팀을 만들어보세요."
            />
          ) : (
            <>
              {/* 모바일에서는 고정폭 테이블이 가로 스크롤을 유발하므로 weekly-log 목록과
                  동일하게 md 미만은 카드, md 이상은 테이블로 나눠 렌더링한다. */}
              <DepartmentCardList
                departments={departments}
                organizations={organizations}
                divisions={allDivisions}
                headCandidatesByDepartment={headCandidatesByDepartment}
                countMap={countMap}
              />
              <div className="hidden overflow-hidden rounded-lg border shadow-sm md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-11 pl-4 text-sm font-bold tracking-wide text-foreground uppercase">
                        팀명
                      </TableHead>
                      <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                        소속 부문
                      </TableHead>
                      <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                        소속 부서
                      </TableHead>
                      <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                        팀장
                      </TableHead>
                      <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                        소속 인원 수
                      </TableHead>
                      <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                        주간업무일지 수
                      </TableHead>
                      <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                        상태
                      </TableHead>
                      <TableHead className="h-11 pr-4 text-right text-sm font-bold tracking-wide text-foreground uppercase">
                        액션
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((department) => {
                      const { memberCount, logCount } = countMap.get(department.id) ?? {
                        memberCount: 0,
                        logCount: 0,
                      };
                      const isArchived = Boolean(department.archived_at);

                      return (
                        <TableRow key={department.id}>
                          <TableCell className="py-3 pl-4 font-medium">
                            {department.name}
                          </TableCell>
                          <TableCell className="py-3 text-muted-foreground">
                            {department.organization_name}
                          </TableCell>
                          <TableCell className="py-3 text-muted-foreground">
                            {department.division_name ?? "-"}
                          </TableCell>
                          <TableCell className="py-3 text-muted-foreground">
                            {formatHeadName(
                              department.head_profile_id
                                ? { name: department.head_name, email: department.head_email }
                                : null,
                            )}
                          </TableCell>
                          <TableCell className="py-3 tabular-nums text-muted-foreground">
                            {memberCount}명
                          </TableCell>
                          <TableCell className="py-3 tabular-nums text-muted-foreground">
                            {logCount}건
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant={isArchived ? "secondary" : "success"}>
                              {isArchived ? "비활성" : "활성"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            <DepartmentRowActions
                              department={department}
                              organizations={organizations}
                              divisions={allDivisions}
                              headCandidates={headCandidatesByDepartment.get(department.id) ?? []}
                              memberCount={memberCount}
                              logCount={logCount}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DimOnPending>
      </div>
    </NavigationProgressProvider>
  );
}

type AdminDepartmentsPageProps = {
  searchParams: Promise<AdminDepartmentsSearchParams>;
};

export default function AdminDepartmentsPage({ searchParams }: AdminDepartmentsPageProps) {
  return (
    <Suspense fallback={<AdminDepartmentsSkeleton />}>
      <DepartmentsContent searchParams={searchParams} />
    </Suspense>
  );
}
