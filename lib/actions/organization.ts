"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { NONE_SELECT_VALUE } from "@/lib/constants/select";
import { organizationSchema, type OrganizationFormData } from "@/lib/schemas/organization";

export type OrganizationActionResult =
  | { success: true }
  | { success: false; error: string };

const ORGANIZATIONS_PATH = "/protected/admin/organizations";

// Postgres 오류 코드 (supabase-js는 PostgrestError.code에 문자열로 담아 전달한다).
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const RLS_VIOLATION = "42501";

function toNullableId(value: string): string | null {
  return value === NONE_SELECT_VALUE ? null : value;
}

async function requireLoggedIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { error: "로그인이 필요합니다." };
  }
  return { userId: data.claims.sub };
}

// assignOrganizationDirectHeadAction 전용 — profiles.department_id도 함께 바꾸는데,
// profiles RLS는 organization_id 컬럼이 없어 조직 범위를 모른다(CLAUDE.md "사용자 관리는
// RLS가 아니라 서버 액션 레벨에서" 절과 동일한 이유). lib/actions/user-admin.ts의
// requireCallerAdmin/isDepartmentAccessible과 같은 검증을 이 파일 안에 그대로 반복한다 —
// 이 파일의 requireLoggedIn처럼 액션 파일마다 자체 인증 헬퍼를 두는 기존 관례를 따른 것.
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

// 조직명 중복(23505)은 raw 에러를 그대로 노출하지 않고 한국어 메시지로 변환한다. RLS
// 위반은 organizations_update_admin(일반 관리자는 자기 소속 조직 밖) 또는
// organizations_insert_superadmin(슈퍼관리자가 아님) 정책에 걸린 경우다 — 삭제는
// 여전히 정책 자체가 없어(소프트 삭제만 지원) 액션도 제공하지 않는다.
function toActionError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === UNIQUE_VIOLATION) {
    return "이미 존재하는 부문명입니다.";
  }
  if (error.code === FOREIGN_KEY_VIOLATION && error.message.includes("head_profile_id")) {
    return "선택한 부문장이 존재하지 않습니다. 다시 선택해주세요.";
  }
  if (error.code === RLS_VIOLATION) {
    return "권한이 없습니다.";
  }
  return fallback;
}

// 조직 생성은 슈퍼관리자만 가능하다(organizations_insert_superadmin RLS 정책). 일반
// 관리자가 호출하면 RLS 위반(42501)으로 거부되어 "권한이 없습니다."로 변환된다.
export async function createOrganizationAction(
  values: OrganizationFormData,
): Promise<OrganizationActionResult> {
  const parsed = organizationSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase.from("organizations").insert({
    name: parsed.data.name,
    head_profile_id: toNullableId(parsed.data.head_profile_id),
  });

  if (error) {
    return {
      success: false,
      error: toActionError(error, "부문 생성 중 오류가 발생했습니다."),
    };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  return { success: true };
}

export async function updateOrganizationAction(
  id: string,
  values: OrganizationFormData,
): Promise<OrganizationActionResult> {
  const parsed = organizationSchema.safeParse(values);
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
    .from("organizations")
    .update({
      name: parsed.data.name,
      head_profile_id: toNullableId(parsed.data.head_profile_id),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: toActionError(error, "부문명 수정 중 오류가 발생했습니다."),
    };
  }
  if (!updated) {
    return { success: false, error: "수정 권한이 없거나 존재하지 않는 부문입니다." };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  revalidatePath("/protected/admin/departments");
  return { success: true };
}

export async function archiveOrganizationAction(id: string): Promise<OrganizationActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("organizations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "부문 비활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 부문입니다." };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  return { success: true };
}

export async function restoreOrganizationAction(id: string): Promise<OrganizationActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("organizations")
    .update({ archived_at: null })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "부문 활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 부문입니다." };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  return { success: true };
}

// 특정 팀에 속하지 않고 부문 전체를 총괄하는 부문장을 "직속" 더미 팀으로 옮기고 곧바로
// head_profile_id까지 지정하는 원클릭 액션(CLAUDE.md "부문장/부서장/팀장" 절 참고) —
// 예전엔 "직속 팀 만들기" 버튼으로 팀만 만든 뒤 사용자 관리에서 따로 소속을 옮기고 다시
// 돌아와 장을 지정해야 했는데, 실제 팀 목록에서 하나를 골라야 하는 그 과정이 부자연스럽다는
// 피드백에 따라 세 단계(직속 팀 확보 → 소속 이동 → 장 지정)를 한 번의 서버 호출로 묶었다.
// 대상은 이미 이 조직의 어떤 팀에 소속되어 있어야 한다 — 사용자 관리 화면과 동일한 전제로,
// department_id가 아직 없는(팀을 선택하지 않은) 사용자는 애초에 그 화면에도 노출되지 않는다.
export async function assignOrganizationDirectHeadAction(
  organizationId: string,
  profileId: string,
): Promise<OrganizationActionResult> {
  const supabase = await createClient();
  const auth = await requireOrgScopedAdmin(supabase, organizationId);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();
  if (!organization) {
    return { success: false, error: "존재하지 않는 부문입니다." };
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
  // 플래그로 찾는다 — 이름("{부문명} 직속")으로 찾으면 관리자가 팀 관리 화면에서 이름을
  // 바꿨을 때 중복 생성될 수 있다.
  const { data: existingDirect } = await supabase
    .from("departments")
    .select("id")
    .eq("organization_id", organizationId)
    .is("division_id", null)
    .eq("is_direct_report", true)
    .maybeSingle();

  let directDepartmentId = existingDirect?.id ?? null;
  if (!directDepartmentId) {
    const { data: created, error: createError } = await supabase
      .from("departments")
      .insert({
        name: `${organization.name} 직속`,
        organization_id: organizationId,
        division_id: null,
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

  // validate_organization_head() 트리거가 위에서 옮긴 department_id를 그대로 확인하므로
  // 소속 이동 다음에 head_profile_id를 지정해야 한다(순서 중요).
  const { error: headError } = await supabase
    .from("organizations")
    .update({ head_profile_id: profileId })
    .eq("id", organizationId);
  if (headError) {
    return {
      success: false,
      error: toActionError(headError, "부문장 지정 중 오류가 발생했습니다."),
    };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  revalidatePath("/protected/admin/departments");
  revalidatePath("/protected/admin/users");
  return { success: true };
}
