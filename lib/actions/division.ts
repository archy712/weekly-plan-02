"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { NONE_SELECT_VALUE } from "@/lib/constants/select";
import { divisionSchema, type DivisionFormData } from "@/lib/schemas/division";

function toNullableId(value: string): string | null {
  return value === NONE_SELECT_VALUE ? null : value;
}

export type DivisionActionResult =
  | { success: true }
  | { success: false; error: string };

const DIVISIONS_PATH = "/protected/admin/divisions";
const DEPARTMENTS_PATH = "/protected/admin/departments";

// Postgres 오류 코드 (supabase-js는 PostgrestError.code에 문자열로 담아 전달한다).
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const RLS_VIOLATION = "42501";

// 이름과 달리 관리자 권한은 확인하지 않는다 — 로그인 여부만 확인하고, 실제 쓰기 권한
// (조직 범위 포함)은 divisions의 INSERT/UPDATE/DELETE RLS(is_admin() AND
// organization_id = current_organization_id())에 위임한다(의도된 설계).
async function requireLoggedIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { error: "로그인이 필요합니다." };
  }
  return { userId: data.claims.sub };
}

// assignDivisionDirectHeadAction 전용 — lib/actions/organization.ts의
// requireOrgScopedAdmin/isDepartmentInScope와 동일한 이유·동일한 로직을 그대로 반복한다
// (profiles RLS가 organization_id를 모르는 문제, CLAUDE.md "사용자 관리는 RLS가 아니라
// 서버 액션 레벨에서" 절 참고). 이 파일의 requireLoggedIn처럼 액션 파일마다 자체 인증
// 헬퍼를 두는 기존 관례를 따른 것.
async function requireOrgScopedAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
): Promise<{ isSuperAdmin: boolean } | { error: string }> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { error: "로그인이 필요합니다." };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, departments:departments!profiles_department_id_fkey(organization_id)")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (callerProfile?.role !== "admin" && callerProfile?.role !== "superadmin") {
    return { error: "권한이 없습니다." };
  }

  const isSuperAdmin = callerProfile.role === "superadmin";
  if (!isSuperAdmin && callerProfile.departments?.organization_id !== organizationId) {
    return { error: "권한이 없습니다." };
  }

  return { isSuperAdmin };
}

async function isDepartmentInScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  departmentId: string | null,
  organizationId: string,
  isSuperAdmin: boolean,
): Promise<boolean> {
  if (!departmentId) return false;
  let query = supabase.from("departments").select("id").eq("id", departmentId);
  if (!isSuperAdmin) {
    query = query.eq("organization_id", organizationId);
  }
  const { data } = await query.maybeSingle();
  return Boolean(data);
}

// 부서명 중복(23505, 부문 내에서만 유일하면 되므로 (organization_id, name) 복합 unique)은
// raw 에러를 그대로 노출하지 않고 한국어 메시지로 변환한다. organization_id FK 위반은
// 선택한 부문이 그 사이 삭제된 경합 상황이고, departments.division_id FK 위반은 이 부서에
// 속한 팀이 있어 삭제할 수 없는 경합 상황(삭제 전 미리 세는 UI가 있어도 경합은 남는다)이다.
async function toActionError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  error: { code?: string; message: string },
  divisionId: string | null,
  fallback: string,
): Promise<string> {
  if (error.code === UNIQUE_VIOLATION) {
    return "이미 존재하는 부서명입니다.";
  }
  if (error.code === FOREIGN_KEY_VIOLATION && error.message.includes("organization_id")) {
    return "선택한 부문이 존재하지 않습니다. 다시 선택해주세요.";
  }
  if (error.code === FOREIGN_KEY_VIOLATION && error.message.includes("head_profile_id")) {
    return "선택한 부서장이 존재하지 않습니다. 다시 선택해주세요.";
  }
  if (error.code === FOREIGN_KEY_VIOLATION && divisionId) {
    const { count: departmentCount } = await supabase
      .from("departments")
      .select("id", { count: "exact", head: true })
      .eq("division_id", divisionId);
    return `이 부서에 속한 팀 ${departmentCount ?? 0}개가 있어 삭제할 수 없습니다. 비활성화하면 신규 선택 목록에서만 숨겨집니다.`;
  }
  if (error.code === RLS_VIOLATION) {
    return "권한이 없습니다.";
  }
  return fallback;
}

export async function createDivisionAction(
  values: DivisionFormData,
): Promise<DivisionActionResult> {
  const parsed = divisionSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase.from("divisions").insert({
    name: parsed.data.name,
    organization_id: parsed.data.organization_id,
    head_profile_id: toNullableId(parsed.data.head_profile_id),
  });

  if (error) {
    return {
      success: false,
      error: await toActionError(supabase, error, null, "부서 추가 중 오류가 발생했습니다."),
    };
  }

  revalidatePath(DIVISIONS_PATH);
  return { success: true };
}

export async function updateDivisionAction(
  id: string,
  values: DivisionFormData,
): Promise<DivisionActionResult> {
  const parsed = divisionSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("divisions")
    .update({
      name: parsed.data.name,
      organization_id: parsed.data.organization_id,
      head_profile_id: toNullableId(parsed.data.head_profile_id),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: await toActionError(supabase, error, id, "부서 수정 중 오류가 발생했습니다."),
    };
  }
  // RLS(is_admin())가 관리자가 아닌 호출자의 행을 걸러내므로 존재하지 않거나 권한이
  // 없으면 0건이 반환된다(관리자 UI는 이미 레이아웃 가드로 막혀 있으므로 방어적 처리).
  if (!updated) {
    return { success: false, error: "수정 권한이 없거나 존재하지 않는 부서입니다." };
  }

  revalidatePath(DIVISIONS_PATH);
  revalidatePath(DEPARTMENTS_PATH);
  return { success: true };
}

export async function archiveDivisionAction(id: string): Promise<DivisionActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("divisions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "부서 비활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 부서입니다." };
  }

  revalidatePath(DIVISIONS_PATH);
  return { success: true };
}

export async function restoreDivisionAction(id: string): Promise<DivisionActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("divisions")
    .update({ archived_at: null })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "부서 활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 부서입니다." };
  }

  revalidatePath(DIVISIONS_PATH);
  return { success: true };
}

// 기본 삭제 정책은 비활성화(소프트 삭제)이며, 이 액션은 참조(소속 팀)가 전혀 없을 때만
// UI에서 노출된다. 그럼에도 호출 사이 경합으로 departments.division_id FK(기본
// ON DELETE NO ACTION)에 걸릴 수 있어 그 경우도 toActionError가 동일한 안내 문구로 폴백한다.
export async function deleteDivisionAction(id: string): Promise<DivisionActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: deleted, error } = await supabase
    .from("divisions")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: await toActionError(supabase, error, id, "부서 삭제 중 오류가 발생했습니다."),
    };
  }
  if (!deleted) {
    return { success: false, error: "권한이 없거나 존재하지 않는 부서입니다." };
  }

  revalidatePath(DIVISIONS_PATH);
  return { success: true };
}

// 특정 팀에 속하지 않고 부서 전체를 총괄하는 부서장을 "직속" 더미 팀으로 옮기고 곧바로
// head_profile_id까지 지정하는 원클릭 액션 — lib/actions/organization.ts의
// assignOrganizationDirectHeadAction과 동일한 배경·순서(직속 팀 확보 → 소속 이동 → 장
// 지정)를 부서(division) 단위로 반복한다. 대상은 이미 이 조직의 어떤 팀에 소속되어
// 있어야 한다(사용자 관리 화면과 동일한 전제).
export async function assignDivisionDirectHeadAction(
  divisionId: string,
  organizationId: string,
  profileId: string,
): Promise<DivisionActionResult> {
  const supabase = await createClient();
  const auth = await requireOrgScopedAdmin(supabase, organizationId);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: division } = await supabase
    .from("divisions")
    .select("id, name, organization_id")
    .eq("id", divisionId)
    .maybeSingle();
  if (!division || division.organization_id !== organizationId) {
    return { success: false, error: "존재하지 않는 부서입니다." };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!targetProfile) {
    return { success: false, error: "존재하지 않는 사용자입니다." };
  }
  if (!targetProfile.department_id) {
    return { success: false, error: "먼저 팀을 선택한 사용자만 지정할 수 있습니다." };
  }
  if (
    !(await isDepartmentInScope(supabase, targetProfile.department_id, organizationId, auth.isSuperAdmin))
  ) {
    return { success: false, error: "권한이 없습니다." };
  }

  // 직속 팀을 찾거나(이미 만들어져 있으면 재사용) 없으면 새로 만든다. is_direct_report
  // 플래그로 찾는다 — 이름("{부서명} 직속")으로 찾으면 관리자가 팀 관리 화면에서 이름을
  // 바꿨을 때 중복 생성될 수 있다.
  const { data: existingDirect } = await supabase
    .from("departments")
    .select("id")
    .eq("division_id", divisionId)
    .eq("is_direct_report", true)
    .maybeSingle();

  let directDepartmentId = existingDirect?.id ?? null;
  if (!directDepartmentId) {
    const { data: created, error: createError } = await supabase
      .from("departments")
      .insert({
        name: `${division.name} 직속`,
        organization_id: organizationId,
        division_id: divisionId,
        is_direct_report: true,
      })
      .select("id")
      .single();
    if (createError || !created) {
      return {
        success: false,
        error:
          createError?.code === UNIQUE_VIOLATION
            ? "이미 같은 이름의 팀이 존재합니다. 관리자에게 문의해주세요."
            : "직속 팀 생성 중 오류가 발생했습니다.",
      };
    }
    directDepartmentId = created.id;
  }

  const { error: moveError } = await supabase
    .from("profiles")
    .update({ department_id: directDepartmentId })
    .eq("id", profileId);
  if (moveError) {
    return { success: false, error: "소속 팀 변경 중 오류가 발생했습니다." };
  }

  // validate_division_head() 트리거가 위에서 옮긴 department_id를 그대로 확인하므로
  // 소속 이동 다음에 head_profile_id를 지정해야 한다(순서 중요).
  const { error: headError } = await supabase
    .from("divisions")
    .update({ head_profile_id: profileId })
    .eq("id", divisionId);
  if (headError) {
    return {
      success: false,
      error: await toActionError(supabase, headError, divisionId, "부서장 지정 중 오류가 발생했습니다."),
    };
  }

  revalidatePath(DIVISIONS_PATH);
  revalidatePath(DEPARTMENTS_PATH);
  revalidatePath("/protected/admin/users");
  return { success: true };
}
