import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminOrganizationsSkeleton } from "@/components/admin-organizations-skeleton";
import { OrganizationRowActions } from "@/components/organization-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 관리자는 자기 소속 조직 1건만 관리할 수 있다(별도의 "전체 관리자" 등급이 없음) —
// 조직을 여러 건 나열하던 목록 화면은 의미가 없어져 단일 카드로 대체한다. 생성/삭제
// 경로도 없다(RLS의 insert/delete 정책 자체를 제거함, lib/actions/organization.ts 참고).
async function OrganizationContent() {
  const supabase = await createClient();
  const { organizationId } = await requireAdmin();

  const [{ data: organization, error: organizationError }, { count: departmentCount }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, archived_at")
        .eq("id", organizationId)
        .single(),
      supabase
        .from("departments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
    ]);

  if (organizationError) {
    throw organizationError;
  }

  const isArchived = Boolean(organization.archived_at);

  return (
    <Card className="max-w-md">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{organization.name}</CardTitle>
        <Badge variant={isArchived ? "secondary" : "success"}>
          {isArchived ? "비활성" : "활성"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="text-sm text-muted-foreground">소속 부서 {departmentCount ?? 0}개</div>
        <OrganizationRowActions organization={organization} />
      </CardContent>
    </Card>
  );
}

export default function AdminOrganizationsPage() {
  return (
    <Suspense fallback={<AdminOrganizationsSkeleton />}>
      <OrganizationContent />
    </Suspense>
  );
}
