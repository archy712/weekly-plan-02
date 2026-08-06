import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { AdminOrganizationsSkeleton } from "@/components/admin-organizations-skeleton";
import { OrganizationCardList } from "@/components/organization-card";
import { OrganizationFormDialog } from "@/components/organization-form-dialog";
import { OrganizationRowActions } from "@/components/organization-row-actions";
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

async function OrganizationsContent() {
  const supabase = await createClient();

  const { data: organizationRows, error: organizationsError } = await supabase
    .from("organizations")
    .select("id, name, created_at, archived_at")
    .order("name");

  if (organizationsError) {
    throw organizationsError;
  }

  const organizations = organizationRows ?? [];

  // 소속 부서 수는 삭제 가능 여부를 사용자가 미리 알 수 있게 하기 위한 것이라(부서 관리
  // 화면과 동일한 원칙) 조직별로 count 집계 쿼리를 병렬로 실행한다.
  const counts = await Promise.all(
    organizations.map(async (organization) => {
      const { count } = await supabase
        .from("departments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id);
      return { id: organization.id, departmentCount: count ?? 0 };
    }),
  );
  const countMap = new Map(counts.map((entry) => [entry.id, entry.departmentCount]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <OrganizationFormDialog
          mode="create"
          trigger={<Button>조직 추가</Button>}
        />
      </div>
      {organizations.length === 0 ? (
        <EmptyState
          title="등록된 조직이 없습니다"
          description="조직 추가 버튼을 눌러 첫 조직을 만들어보세요."
        />
      ) : (
        <>
          {/* 모바일에서는 고정폭 테이블이 가로 스크롤을 유발하므로 부서 관리와 동일하게
              md 미만은 카드, md 이상은 테이블로 나눠 렌더링한다. */}
          <OrganizationCardList organizations={organizations} countMap={countMap} />
          <div className="hidden overflow-hidden rounded-lg border shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 pl-4 text-sm font-bold tracking-wide text-foreground uppercase">
                    조직명
                  </TableHead>
                  <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                    소속 부서 수
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
                {organizations.map((organization) => {
                  const departmentCount = countMap.get(organization.id) ?? 0;
                  const isArchived = Boolean(organization.archived_at);

                  return (
                    <TableRow key={organization.id}>
                      <TableCell className="py-3 pl-4 font-medium">
                        {organization.name}
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
                        <OrganizationRowActions
                          organization={organization}
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

export default function AdminOrganizationsPage() {
  return (
    <Suspense fallback={<AdminOrganizationsSkeleton />}>
      <OrganizationsContent />
    </Suspense>
  );
}
