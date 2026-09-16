import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminWorkTypesSkeleton } from "@/components/admin-work-types-skeleton";
import { EmptyState } from "@/components/empty-state";
import { WorkTypeFormDialog } from "@/components/work-type-form-dialog";
import { WorkTypeSortableList } from "@/components/work-type-sortable-list";
import { Button } from "@/components/ui/button";

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

  // 노출 순서는 관리자가 드래그로 정한 sort_order를 따른다(같은 값이면 이름순) — 진행업무
  // 등록/상세 화면의 업무 타입 체크박스도 동일한 기준으로 정렬한다.
  let workTypesQuery = supabase
    .from("work_types")
    .select(
      "id, name, created_at, archived_at, organization_id, sort_order, organizations:organizations(name)",
    )
    .order("sort_order")
    .order("name");
  if (!isSuperAdmin) {
    workTypesQuery = workTypesQuery.eq("organization_id", organizationId);
  }
  const { data: workTypeRows, error: workTypesError } = await workTypesQuery;

  if (workTypesError) {
    throw workTypesError;
  }

  // 슈퍼관리자는 여러 부문의 업무 타입을 한 테이블에서 보므로, 부문끼리 섞이지 않도록
  // 부문명으로 먼저 묶는다(정렬 자체는 부문 안에서만 의미가 있다). PostgREST로는 embed된
  // organizations.name 기준 부모 정렬이 안 되므로 여기서 한 번 더 정렬한다.
  const workTypes = (workTypeRows ?? [])
    .map((workType) => ({
      id: workType.id,
      name: workType.name,
      created_at: workType.created_at,
      archived_at: workType.archived_at,
      organization_id: workType.organization_id,
      organization_name: workType.organizations?.name ?? "",
      sort_order: workType.sort_order,
    }))
    .sort(
      (a, b) =>
        a.organization_name.localeCompare(b.organization_name, "ko") ||
        a.sort_order - b.sort_order ||
        a.name.localeCompare(b.name, "ko"),
    );

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
  // Map 대신 평범한 객체로 넘긴다(클라이언트 컴포넌트 prop 직렬화).
  const logCounts = Object.fromEntries(counts.map((entry) => [entry.id, entry.logCount]));

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
        /* 드래그 정렬이 필요해 목록 전체가 클라이언트 컴포넌트다. 모바일 카드/데스크탑
           테이블 두 표현 모두 이 컴포넌트가 담당한다(md 미만은 카드, 이상은 테이블). */
        <WorkTypeSortableList
          workTypes={workTypes}
          organizations={organizations}
          logCounts={logCounts}
        />
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
