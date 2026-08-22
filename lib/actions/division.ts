"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { divisionSchema, type DivisionFormData } from "@/lib/schemas/division";

export type DivisionActionResult =
  | { success: true }
  | { success: false; error: string };

const DIVISIONS_PATH = "/protected/admin/divisions";
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
    .update({ name: parsed.data.name, organization_id: parsed.data.organization_id })
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
