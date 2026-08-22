import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminOrganizationsSkeleton } from "@/components/admin-organizations-skeleton";
import { OrganizationFormDialog } from "@/components/organization-form-dialog";
import { OrganizationRowActions } from "@/components/organization-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHeadName } from "@/lib/format";
import type { HeadCandidate } from "@/lib/types";

// 일반 관리자는 자기 소속 조직 1건만 관리할 수 있다(생성 경로 없음, RLS의
// organizations_update_admin이 id = current_organization_id()로 제한) — 단일 카드로 보여준다.
async function AdminOrganizationCard({ organizationId }: { organizationId: string }) {
  const supabase = await createClient();

  const [
    { data: organization, error: organizationError },
    { data: departmentRows, error: departmentsError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, archived_at, head_profile_id, head_profile:profiles!organizations_head_profile_id_fkey(id, name, email)",
      )
      .eq("id", organizationId)
      .single(),
    supabase.from("departments").select("id").eq("organization_id", organizationId),
  ]);

  if (organizationError) {
    throw organizationError;
  }
  if (departmentsError) {
    throw departmentsError;
  }

  const departmentIds = (departmentRows ?? []).map((department) => department.id);
  const { data: memberRows, error: membersError } =
    departmentIds.length === 0
      ? { data: [] as { id: string; name: string | null; email: string | null }[], error: null }
      : await supabase.from("profiles").select("id, name, email").in("department_id", departmentIds);

  if (membersError) {
    throw membersError;
  }

  const headCandidates: HeadCandidate[] = memberRows ?? [];
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
        <div className="text-sm text-muted-foreground">
          <div>
            부문장{" "}
            {formatHeadName(
              organization.head_profile_id
                ? { name: organization.head_profile?.name ?? null, email: organization.head_profile?.email ?? null }
                : null,
            )}
          </div>
          <div>소속 팀 {departmentIds.length}개</div>
        </div>
        <OrganizationRowActions organization={organization} headCandidates={headCandidates} />
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
    supabase
      .from("organizations")
      .select(
        "id, name, archived_at, head_profile_id, head_profile:profiles!organizations_head_profile_id_fkey(id, name, email)",
      )
      .order("name"),
    supabase.from("departments").select("id, organization_id"),
  ]);

  if (organizationsError) {
    throw organizationsError;
  }
  if (departmentsError) {
    throw departmentsError;
  }

  const departmentCounts = new Map<string, number>();
  const departmentIdToOrganizationId = new Map<string, string>();
  for (const row of departmentRows ?? []) {
    departmentCounts.set(row.organization_id, (departmentCounts.get(row.organization_id) ?? 0) + 1);
    departmentIdToOrganizationId.set(row.id, row.organization_id);
  }

  const allDepartmentIds = (departmentRows ?? []).map((row) => row.id);
  const { data: memberRows, error: membersError } =
    allDepartmentIds.length === 0
      ? {
          data: [] as { id: string; name: string | null; email: string | null; department_id: string | null }[],
          error: null,
        }
      : await supabase
          .from("profiles")
          .select("id, name, email, department_id")
          .in("department_id", allDepartmentIds);

  if (membersError) {
    throw membersError;
  }

  const headCandidatesByOrganization = new Map<string, HeadCandidate[]>();
  for (const member of memberRows ?? []) {
    const organizationId = member.department_id
      ? departmentIdToOrganizationId.get(member.department_id)
      : undefined;
    if (!organizationId) continue;
    const candidates = headCandidatesByOrganization.get(organizationId) ?? [];
    candidates.push({ id: member.id, name: member.name, email: member.email });
    headCandidatesByOrganization.set(organizationId, candidates);
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
                  <div>
                    부문장{" "}
                    {formatHeadName(
                      organization.head_profile_id
                        ? {
                            name: organization.head_profile?.name ?? null,
                            email: organization.head_profile?.email ?? null,
                          }
                        : null,
                    )}
                  </div>
                  <div>소속 팀 {departmentCounts.get(organization.id) ?? 0}개</div>
                </div>
                <OrganizationRowActions
                  organization={organization}
                  headCandidates={headCandidatesByOrganization.get(organization.id) ?? []}
                />
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
