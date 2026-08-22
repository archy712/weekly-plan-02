import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminDepartmentsSkeleton } from "@/components/admin-departments-skeleton";
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

async function DepartmentsContent() {
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
    .select("id, name, created_at, archived_at");
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

  let departmentsQuery = supabase
    .from("departments")
    .select("id, name, created_at, archived_at, organization_id, organizations:organizations(name)")
    .order("name");
  if (!isSuperAdmin) {
    departmentsQuery = departmentsQuery.eq("organization_id", organizationId);
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
  }));

  // 부서원 수/업무일지 수는 삭제 가능 여부를 사용자가 미리 알 수 있게 하기 위한 것이라
  // 부서별로 count 집계 쿼리를 병렬로 실행한다(부서 수가 적은 사내 도구 특성상 N*2건의
  // count-only 쿼리로도 충분히 빠르다).
  const counts = await Promise.all(
    departments.map(async (department) => {
      const [{ count: memberCount }, { count: logCount }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("department_id", department.id),
        supabase
          .from("weekly_logs")
          .select("id", { count: "exact", head: true })
          .eq("department_id", department.id),
      ]);
      return {
        id: department.id,
        memberCount: memberCount ?? 0,
        logCount: logCount ?? 0,
      };
    }),
  );
  const countMap = new Map(counts.map((entry) => [entry.id, entry]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DepartmentFormDialog
          mode="create"
          organizations={organizations}
          trigger={<Button>팀 추가</Button>}
        />
      </div>
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
                    소속 조직
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
    </div>
  );
}

export default function AdminDepartmentsPage() {
  return (
    <Suspense fallback={<AdminDepartmentsSkeleton />}>
      <DepartmentsContent />
    </Suspense>
  );
}
