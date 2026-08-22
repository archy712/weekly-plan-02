import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminOrganizationsSkeleton } from "@/components/admin-organizations-skeleton";
import { OrganizationFormDialog } from "@/components/organization-form-dialog";
import { OrganizationRowActions } from "@/components/organization-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 일반 관리자는 자기 소속 조직 1건만 관리할 수 있다(생성 경로 없음, RLS의
// organizations_update_admin이 id = current_organization_id()로 제한) — 단일 카드로 보여준다.
async function AdminOrganizationCard({ organizationId }: { organizationId: string }) {
  const supabase = await createClient();

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
        <div className="text-sm text-muted-foreground">소속 팀 {departmentCount ?? 0}개</div>
        <OrganizationRowActions organization={organization} />
      </CardContent>
    </Card>
  );
}

// 슈퍼관리자는 시스템의 모든 조직을 나열하고 생성·수정·닫기(비활성화)할 수 있다
// (organizations_insert_superadmin, organizations_update_admin의 is_superadmin() 분기).
// 대시보드·부서·업무타입·사용자 관리는 이 화면과 달리 여전히 자기 소속 조직으로만
// 범위가 제한된다(전 조직 확장은 의도적으로 범위 밖 — docs/ROADMAP_v1.md 참고).
async function SuperAdminOrganizationList() {
  const supabase = await createClient();

  const [
    { data: organizations, error: organizationsError },
    { data: departmentRows, error: departmentsError },
  ] = await Promise.all([
    supabase.from("organizations").select("id, name, archived_at").order("name"),
    supabase.from("departments").select("organization_id"),
  ]);

  if (organizationsError) {
    throw organizationsError;
  }
  if (departmentsError) {
    throw departmentsError;
  }

  const departmentCounts = new Map<string, number>();
  for (const row of departmentRows ?? []) {
    departmentCounts.set(row.organization_id, (departmentCounts.get(row.organization_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          슈퍼관리자는 시스템의 모든 부문을 생성·수정·닫기(비활성화)할 수 있습니다.
        </p>
        <OrganizationFormDialog trigger={<Button size="sm">새 부문 생성</Button>} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(organizations ?? []).map((organization) => {
          const isArchived = Boolean(organization.archived_at);
          return (
            <Card key={organization.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <CardTitle className="text-base">{organization.name}</CardTitle>
                <Badge variant={isArchived ? "secondary" : "success"}>
                  {isArchived ? "비활성" : "활성"}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="text-sm text-muted-foreground">
                  소속 팀 {departmentCounts.get(organization.id) ?? 0}개
                </div>
                <OrganizationRowActions organization={organization} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

async function OrganizationContent() {
  const { role, organizationId } = await requireAdmin();

  if (role === "superadmin") {
    return <SuperAdminOrganizationList />;
  }

  return <AdminOrganizationCard organizationId={organizationId} />;
}

export default function AdminOrganizationsPage() {
  return (
    <Suspense fallback={<AdminOrganizationsSkeleton />}>
      <OrganizationContent />
    </Suspense>
  );
}
