import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminDivisionsSkeleton } from "@/components/admin-divisions-skeleton";
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

async function DivisionsContent() {
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

  let divisionsQuery = supabase
    .from("divisions")
    .select("id, name, created_at, archived_at, organization_id, organizations:organizations(name)")
    .order("name");
  if (!isSuperAdmin) {
    divisionsQuery = divisionsQuery.eq("organization_id", organizationId);
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
  }));

  // 소속 팀 수는 삭제 가능 여부를 사용자가 미리 알 수 있게 하기 위한 것이라 부서별로
  // count 집계 쿼리를 병렬로 실행한다(부서 수가 적은 사내 도구 특성상 N건의 count-only
  // 쿼리로도 충분히 빠르다, 팀/업무타입 관리와 동일한 패턴).
  const counts = await Promise.all(
    divisions.map(async (division) => {
      const { count } = await supabase
        .from("departments")
        .select("id", { count: "exact", head: true })
        .eq("division_id", division.id);
      return { id: division.id, departmentCount: count ?? 0 };
    }),
  );
  const countMap = new Map(counts.map((entry) => [entry.id, entry.departmentCount]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DivisionFormDialog
          mode="create"
          organizations={organizations}
          trigger={<Button>부서 추가</Button>}
        />
      </div>
      {divisions.length === 0 ? (
        <EmptyState
          title="등록된 부서가 없습니다"
          description="부서 추가 버튼을 눌러 첫 부서를 만들어보세요. 팀은 부서 없이도 부문에 바로 속할 수 있습니다."
        />
      ) : (
        <>
          {/* 모바일에서는 고정폭 테이블이 가로 스크롤을 유발하므로 팀 관리와 동일하게
              md 미만은 카드, md 이상은 테이블로 나눠 렌더링한다. */}
          <DivisionCardList divisions={divisions} organizations={organizations} countMap={countMap} />
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
    </div>
  );
}

export default function AdminDivisionsPage() {
  return (
    <Suspense fallback={<AdminDivisionsSkeleton />}>
      <DivisionsContent />
    </Suspense>
  );
}
