import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
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

  const { data: departmentRows, error: departmentsError } = await supabase
    .from("departments")
    .select("id, name, created_at, archived_at")
    .order("name");

  if (departmentsError) {
    throw departmentsError;
  }

  const departments = departmentRows ?? [];

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
          trigger={<Button>부서 추가</Button>}
        />
      </div>
      {departments.length === 0 ? (
        <EmptyState
          title="등록된 부서가 없습니다"
          description="부서 추가 버튼을 눌러 첫 부서를 만들어보세요."
        />
      ) : (
        <>
          {/* 모바일에서는 고정폭 테이블이 가로 스크롤을 유발하므로 weekly-log 목록과
              동일하게 md 미만은 카드, md 이상은 테이블로 나눠 렌더링한다. */}
          <DepartmentCardList departments={departments} countMap={countMap} />
          <div className="hidden overflow-hidden rounded-lg border shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 pl-4 text-sm font-bold tracking-wide text-foreground uppercase">
                    부서명
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
