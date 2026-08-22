"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { formatDepartmentDeleteBlockedMessage } from "@/lib/format";
import { NONE_SELECT_VALUE } from "@/lib/constants/select";
import { departmentSchema, type DepartmentFormData } from "@/lib/schemas/department";

function toNullableId(value: string): string | null {
  return value === NONE_SELECT_VALUE ? null : value;
}

export type DepartmentActionResult =
  | { success: true }
  | { success: false; error: string };

const DEPARTMENTS_PATH = "/protected/admin/departments";

// Postgres 오류 코드 (supabase-js는 PostgrestError.code에 문자열로 담아 전달한다).
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const RLS_VIOLATION = "42501";

async function requireLoggedIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { error: "로그인이 필요합니다." };
  }
  return { userId: data.claims.sub };
}

// 부서명 중복(23505)은 raw 에러를 그대로 노출하지 않고 한국어 메시지로 변환한다.
// 하드 삭제 시 참조(23503)로 실패하는 경합 상황은 실시간으로 최신 인원/로그 수를 다시 세어
// UI에서 미리 보여주는 안내와 동일한 문구로 폴백한다.
async function toActionError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  error: { code?: string; message: string },
  departmentId: string | null,
  fallback: string,
): Promise<string> {
  if (error.code === UNIQUE_VIOLATION) {
    return "이미 존재하는 팀명입니다.";
  }
  // organization_id FK 위반(선택한 조직이 그 사이 삭제된 경합)은 departmentId가 있어도
  // "부서원/업무일지가 있어 삭제 불가" 메시지와는 무관하므로 먼저 구분해서 처리한다.
  if (error.code === FOREIGN_KEY_VIOLATION && error.message.includes("organization_id")) {
    return "선택한 부문이 존재하지 않습니다. 다시 선택해주세요.";
  }
  if (error.code === FOREIGN_KEY_VIOLATION && error.message.includes("division_id")) {
    return "선택한 부서가 존재하지 않습니다. 다시 선택해주세요.";
  }
  if (error.code === FOREIGN_KEY_VIOLATION && error.message.includes("head_profile_id")) {
    return "선택한 팀장이 존재하지 않습니다. 다시 선택해주세요.";
  }
  if (error.code === FOREIGN_KEY_VIOLATION && departmentId) {
    const [{ count: memberCount }, { count: logCount }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("department_id", departmentId),
      supabase
        .from("weekly_logs")
        .select("id", { count: "exact", head: true })
        .eq("department_id", departmentId),
    ]);
    return formatDepartmentDeleteBlockedMessage(memberCount ?? 0, logCount ?? 0);
  }
  if (error.code === RLS_VIOLATION) {
    return "권한이 없습니다.";
  }
  return fallback;
}

export async function createDepartmentAction(
  values: DepartmentFormData,
): Promise<DepartmentActionResult> {
  const parsed = departmentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase.from("departments").insert({
    name: parsed.data.name,
    organization_id: parsed.data.organization_id,
    division_id: toNullableId(parsed.data.division_id),
    head_profile_id: toNullableId(parsed.data.head_profile_id),
  });

  if (error) {
    return {
      success: false,
      error: await toActionError(supabase, error, null, "팀 추가 중 오류가 발생했습니다."),
    };
  }

  revalidatePath(DEPARTMENTS_PATH);
  return { success: true };
}

export async function updateDepartmentAction(
  id: string,
  values: DepartmentFormData,
): Promise<DepartmentActionResult> {
  const parsed = departmentSchema.safeParse(values);
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
    .from("departments")
    .update({
      name: parsed.data.name,
      organization_id: parsed.data.organization_id,
      division_id: toNullableId(parsed.data.division_id),
      head_profile_id: toNullableId(parsed.data.head_profile_id),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: await toActionError(supabase, error, id, "팀 수정 중 오류가 발생했습니다."),
    };
  }
  // RLS(is_admin())가 관리자가 아닌 호출자의 행을 걸러내므로 존재하지 않거나 권한이
  // 없으면 0건이 반환된다(관리자 UI는 이미 레이아웃 가드로 막혀 있으므로 방어적 처리).
  if (!updated) {
    return { success: false, error: "수정 권한이 없거나 존재하지 않는 팀입니다." };
  }

  revalidatePath(DEPARTMENTS_PATH);
  return { success: true };
}

export async function archiveDepartmentAction(id: string): Promise<DepartmentActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("departments")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "팀 비활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 팀입니다." };
  }

  revalidatePath(DEPARTMENTS_PATH);
  return { success: true };
}

export async function restoreDepartmentAction(id: string): Promise<DepartmentActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("departments")
    .update({ archived_at: null })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "팀 활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 팀입니다." };
  }

  revalidatePath(DEPARTMENTS_PATH);
  return { success: true };
}

// 기본 삭제 정책은 비활성화(소프트 삭제)이며, 이 액션은 참조가 전혀 없을 때만 UI에서
// 노출된다. 그럼에도 호출 사이 경합으로 weekly_logs RESTRICT FK(23503)에 걸릴 수 있어
// 그 경우도 동일한 한국어 안내 메시지로 폴백한다 — profiles_department_id_fkey는
// ON DELETE SET NULL이라 이 가드가 없으면 부서원이 조용히 미소속 상태가 될 수 있다.
export async function deleteDepartmentAction(id: string): Promise<DepartmentActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: deleted, error } = await supabase
    .from("departments")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: await toActionError(supabase, error, id, "팀 삭제 중 오류가 발생했습니다."),
    };
  }
  if (!deleted) {
    return { success: false, error: "권한이 없거나 존재하지 않는 팀입니다." };
  }

  revalidatePath(DEPARTMENTS_PATH);
  return { success: true };
}
