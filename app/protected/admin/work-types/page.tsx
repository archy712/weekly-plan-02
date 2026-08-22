import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminWorkTypesSkeleton } from "@/components/admin-work-types-skeleton";
import { EmptyState } from "@/components/empty-state";
import { WorkTypeCardList } from "@/components/work-type-card";
import { WorkTypeFormDialog } from "@/components/work-type-form-dialog";
import { WorkTypeRowActions } from "@/components/work-type-row-actions";
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

async function WorkTypesContent() {
  const supabase = await createClient();

  // 부서 게이트·관리자 확인은 app/protected/admin/layout.tsx의 requireAdmin()이 이미
  // 처리하지만, 이 페이지는 관리자 소속 조직으로 범위를 좁혀야 해서 organizationId를
  // 얻기 위해 다시 호출한다.
  const { role, organizationId } = await requireAdmin();
  const isSuperAdmin = role === "superadmin";

  // 일반 관리자는 자기 소속 조직 1건만(폼 선택지에 필요해 업무 타입 조회와 별도로
  // 가져온다). 슈퍼관리자는 F034로 전 조직을 다룰 수 있어 조직 필터 없이 전체를
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

  let workTypesQuery = supabase
    .from("work_types")
    .select("id, name, created_at, archived_at, organization_id, organizations:organizations(name)")
    .order("name");
  if (!isSuperAdmin) {
    workTypesQuery = workTypesQuery.eq("organization_id", organizationId);
  }
  const { data: workTypeRows, error: workTypesError } = await workTypesQuery;

  if (workTypesError) {
    throw workTypesError;
  }

  const workTypes = (workTypeRows ?? []).map((workType) => ({
    id: workType.id,
    name: workType.name,
    created_at: workType.created_at,
    archived_at: workType.archived_at,
    organization_id: workType.organization_id,
    organization_name: workType.organizations?.name ?? "",
  }));

  // 업무일지 수는 삭제 가능 여부를 사용자가 미리 알 수 있게 하기 위한 것이라 업무 타입별로
  // count 집계 쿼리를 병렬로 실행한다(work_type은 FK가 아니라 배열 포함 검사로 센다).
  const counts = await Promise.all(
    workTypes.map(async (workType) => {
      const { count } = await supabase
        .from("weekly_logs")
        .select("id", { count: "exact", head: true })
        .contains("work_type", [workType.name]);
      return { id: workType.id, logCount: count ?? 0 };
    }),
  );
  const countMap = new Map(counts.map((entry) => [entry.id, entry.logCount]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <WorkTypeFormDialog
          mode="create"
          organizations={organizations}
          trigger={<Button>업무 타입 추가</Button>}
        />
      </div>
      {workTypes.length === 0 ? (
        <EmptyState
          title="등록된 업무 타입이 없습니다"
          description="업무 타입 추가 버튼을 눌러 첫 업무 타입을 만들어보세요."
        />
      ) : (
        <>
          {/* 모바일에서는 고정폭 테이블이 가로 스크롤을 유발하므로 부서 관리와 동일하게
              md 미만은 카드, md 이상은 테이블로 나눠 렌더링한다. */}
          <WorkTypeCardList workTypes={workTypes} organizations={organizations} countMap={countMap} />
          <div className="hidden overflow-hidden rounded-lg border shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 pl-4 text-sm font-bold tracking-wide text-foreground uppercase">
                    업무 타입명
                  </TableHead>
                  <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                    소속 부문
                  </TableHead>
                  <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                    업무일지 수
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
                {workTypes.map((workType) => {
                  const logCount = countMap.get(workType.id) ?? 0;
                  const isArchived = Boolean(workType.archived_at);

                  return (
                    <TableRow key={workType.id}>
                      <TableCell className="py-3 pl-4 font-medium">{workType.name}</TableCell>
                      <TableCell className="py-3 text-muted-foreground">
                        {workType.organization_name}
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
                        <WorkTypeRowActions
                          workType={workType}
                          organizations={organizations}
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

export default function AdminWorkTypesPage() {
  return (
    <Suspense fallback={<AdminWorkTypesSkeleton />}>
      <WorkTypesContent />
    </Suspense>
  );
}
