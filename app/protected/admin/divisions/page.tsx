import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminDivisionFilters, ALL_ORGANIZATIONS_FILTER } from "@/components/admin-division-filters";
import { AdminDivisionsSkeleton } from "@/components/admin-divisions-skeleton";
import { DimOnPending, NavigationProgressProvider } from "@/components/navigation-progress";
import { DivisionCardList } from "@/components/division-card";
import { DivisionFormDialog } from "@/components/division-form-dialog";
import { DivisionRowActions } from "@/components/division-row-actions";
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

type AdminDivisionsSearchParams = {
  org?: string;
};

async function DivisionsContent({
  searchParams,
}: {
  searchParams: Promise<AdminDivisionsSearchParams>;
}) {
  const supabase = await createClient();

  // 부서 게이트·관리자 확인은 app/protected/admin/layout.tsx의 requireAdmin()이 이미
  // 처리하지만, 이 페이지는 관리자 소속 부문으로 범위를 좁혀야 해서 organizationId를
  // 얻기 위해 다시 호출한다.
  const { role, organizationId } = await requireAdmin();
  const isSuperAdmin = role === "superadmin";

  // 일반 관리자는 자기 소속 부문 1건만(폼 선택지에 필요해 부서 조회와 별도로 가져온다).
  // 슈퍼관리자는 F034와 동일한 원칙으로 전 부문을 다룰 수 있어 부문 필터 없이 전체를
  // 가져온다 — 테이블의 "소속 부문" 컬럼이 이미 각 행을 구분해 보여준다.
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

  // 슈퍼관리자 전용 "소속 부문" 필터(?org=). 대시보드와 동일하게 존재하지 않거나 자기
  // 범위 밖인 값은 "전체 부문"으로 폴백한다(일반 관리자는 이미 organizationId로 고정돼
  // 있어 이 필터가 렌더링되지 않으므로 항상 undefined).
  const params = await searchParams;
  const requestedOrgId = isSuperAdmin ? params.org : undefined;
  const selectedOrgId =
    requestedOrgId && requestedOrgId !== ALL_ORGANIZATIONS_FILTER &&
    organizations.some((org) => org.id === requestedOrgId)
      ? requestedOrgId
      : undefined;

  let divisionsQuery = supabase
    .from("divisions")
    .select(
      "id, name, created_at, archived_at, organization_id, head_profile_id, organizations:organizations(name), head_profile:profiles!divisions_head_profile_id_fkey(id, name, email)",
    )
    .order("name");
  if (!isSuperAdmin) {
    divisionsQuery = divisionsQuery.eq("organization_id", organizationId);
  } else if (selectedOrgId) {
    divisionsQuery = divisionsQuery.eq("organization_id", selectedOrgId);
  }
  const { data: divisionRows, error: divisionsError } = await divisionsQuery;

  if (divisionsError) {
    throw divisionsError;
  }

  const divisions = (divisionRows ?? []).map((division) => ({
    id: division.id,
    name: division.name,
    created_at: division.created_at,
    archived_at: division.archived_at,
    organization_id: division.organization_id,
    organization_name: division.organizations?.name ?? "",
    head_profile_id: division.head_profile_id,
    head_name: division.head_profile?.name ?? null,
    head_email: division.head_profile?.email ?? null,
  }));

  // 부서장 후보(=이 부서에 속한 팀들의 팀원)와 소속 팀 수는 부서별로 갈라야 해서, 스코프
  // 내 전 팀을 한 번에 조회한 뒤 division_id로 그룹핑하고(팀/업무타입 관리와 동일하게
  // N개 쿼리 대신 1개 쿼리 + 클라이언트 그룹핑), 그 팀 id들로 팀원을 다시 한 번에 조회한다.
  let scopedDepartmentsQuery = supabase.from("departments").select("id, division_id");
  if (!isSuperAdmin) {
    scopedDepartmentsQuery = scopedDepartmentsQuery.eq("organization_id", organizationId);
  } else if (selectedOrgId) {
    scopedDepartmentsQuery = scopedDepartmentsQuery.eq("organization_id", selectedOrgId);
  }
  const { data: scopedDepartmentRows, error: scopedDepartmentsError } =
    await scopedDepartmentsQuery;

  if (scopedDepartmentsError) {
    throw scopedDepartmentsError;
  }

  const departmentCountByDivision = new Map<string, number>();
  const departmentIdsByDivision = new Map<string, string[]>();
  for (const department of scopedDepartmentRows ?? []) {
    if (!department.division_id) continue;
    departmentCountByDivision.set(
      department.division_id,
      (departmentCountByDivision.get(department.division_id) ?? 0) + 1,
    );
    const ids = departmentIdsByDivision.get(department.division_id) ?? [];
    ids.push(department.id);
    departmentIdsByDivision.set(department.division_id, ids);
  }
  const countMap = new Map(
    divisions.map((division) => [division.id, departmentCountByDivision.get(division.id) ?? 0]),
  );

  const allDepartmentIds = (scopedDepartmentRows ?? [])
    .filter((department) => department.division_id)
    .map((department) => department.id);
  const { data: memberRows, error: membersError } =
    allDepartmentIds.length === 0
      ? { data: [] as { id: string; name: string | null; email: string | null; department_id: string | null }[], error: null }
      : await supabase
          .from("profiles")
          .select("id, name, email, department_id")
          .in("department_id", allDepartmentIds);

  if (membersError) {
    throw membersError;
  }

  const departmentIdToDivisionId = new Map<string, string>();
  for (const [divisionId, departmentIds] of departmentIdsByDivision) {
    for (const departmentId of departmentIds) {
      departmentIdToDivisionId.set(departmentId, divisionId);
    }
  }

  const headCandidatesByDivision = new Map<string, HeadCandidate[]>();
  for (const member of memberRows ?? []) {
    const divisionId = member.department_id ? departmentIdToDivisionId.get(member.department_id) : undefined;
    if (!divisionId) continue;
    const candidates = headCandidatesByDivision.get(divisionId) ?? [];
    candidates.push({ id: member.id, name: member.name, email: member.email });
    headCandidatesByDivision.set(divisionId, candidates);
  }

  return (
    <NavigationProgressProvider>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <AdminDivisionFilters organizations={organizations} currentOrgId={selectedOrgId} />
            )}
          </div>
          <DivisionFormDialog
            mode="create"
            organizations={organizations}
            trigger={<Button>부서 추가</Button>}
          />
        </div>
        <DimOnPending className="flex flex-col gap-4">
          {divisions.length === 0 ? (
            <EmptyState
              title="등록된 부서가 없습니다"
              description="부서 추가 버튼을 눌러 첫 부서를 만들어보세요. 팀은 부서 없이도 부문에 바로 속할 수 있습니다."
            />
          ) : (
            <>
              {/* 모바일에서는 고정폭 테이블이 가로 스크롤을 유발하므로 팀 관리와 동일하게
                  md 미만은 카드, md 이상은 테이블로 나눠 렌더링한다. */}
              <DivisionCardList
                divisions={divisions}
                organizations={organizations}
                headCandidatesByDivision={headCandidatesByDivision}
                countMap={countMap}
              />
              <div className="hidden overflow-hidden rounded-lg border shadow-sm md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-11 pl-4 text-sm font-bold tracking-wide text-foreground uppercase">
                        부서명
                      </TableHead>
                      <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                        소속 부문
                      </TableHead>
                      <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                        부서장
                      </TableHead>
                      <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                        소속 팀 수
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
                    {divisions.map((division) => {
                      const departmentCount = countMap.get(division.id) ?? 0;
                      const isArchived = Boolean(division.archived_at);

                      return (
                        <TableRow key={division.id}>
                          <TableCell className="py-3 pl-4 font-medium">{division.name}</TableCell>
                          <TableCell className="py-3 text-muted-foreground">
                            {division.organization_name}
                          </TableCell>
                          <TableCell className="py-3 text-muted-foreground">
                            {formatHeadName(
                              division.head_profile_id
                                ? { name: division.head_name, email: division.head_email }
                                : null,
                            )}
                          </TableCell>
                          <TableCell className="py-3 tabular-nums text-muted-foreground">
                            {departmentCount}개
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant={isArchived ? "secondary" : "success"}>
                              {isArchived ? "비활성" : "활성"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            <DivisionRowActions
                              division={division}
                              organizations={organizations}
                              headCandidates={headCandidatesByDivision.get(division.id) ?? []}
                              departmentCount={departmentCount}
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

type AdminDivisionsPageProps = {
  searchParams: Promise<AdminDivisionsSearchParams>;
};

export default function AdminDivisionsPage({ searchParams }: AdminDivisionsPageProps) {
  return (
    <Suspense fallback={<AdminDivisionsSkeleton />}>
      <DivisionsContent searchParams={searchParams} />
    </Suspense>
  );
}
