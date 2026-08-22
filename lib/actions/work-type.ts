"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { workTypeSchema, type WorkTypeFormData } from "@/lib/schemas/work-type";

export type WorkTypeActionResult =
  | { success: true }
  | { success: false; error: string };

const WORK_TYPES_PATH = "/protected/admin/work-types";

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

// 업무 타입명 중복(23505, 조직 내에서만 유일하면 되므로 (organization_id, name) 복합
// unique)은 raw 에러를 그대로 노출하지 않고 한국어 메시지로 변환한다. organization_id FK
// 위반은 선택한 조직이 그 사이 삭제된 경합 상황이다.
function toActionError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === UNIQUE_VIOLATION) {
    return "이미 존재하는 업무 타입입니다.";
  }
  if (error.code === FOREIGN_KEY_VIOLATION && error.message.includes("organization_id")) {
    return "선택한 부문이 존재하지 않습니다. 다시 선택해주세요.";
  }
  if (error.code === RLS_VIOLATION) {
    return "권한이 없습니다.";
  }
  return fallback;
}

export async function createWorkTypeAction(
  values: WorkTypeFormData,
): Promise<WorkTypeActionResult> {
  const parsed = workTypeSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase.from("work_types").insert({
    name: parsed.data.name,
    organization_id: parsed.data.organization_id,
  });

  if (error) {
    return { success: false, error: toActionError(error, "업무 타입 추가 중 오류가 발생했습니다.") };
  }

  revalidatePath(WORK_TYPES_PATH);
  return { success: true };
}

export async function updateWorkTypeAction(
  id: string,
  values: WorkTypeFormData,
): Promise<WorkTypeActionResult> {
  const parsed = workTypeSchema.safeParse(values);
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
    .from("work_types")
    .update({ name: parsed.data.name, organization_id: parsed.data.organization_id })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: toActionError(error, "업무 타입 수정 중 오류가 발생했습니다.") };
  }
  // RLS(is_admin())가 관리자가 아닌 호출자의 행을 걸러내므로 존재하지 않거나 권한이
  // 없으면 0건이 반환된다(관리자 UI는 이미 레이아웃 가드로 막혀 있으므로 방어적 처리).
  if (!updated) {
    return { success: false, error: "수정 권한이 없거나 존재하지 않는 업무 타입입니다." };
  }

  revalidatePath(WORK_TYPES_PATH);
  return { success: true };
}

export async function archiveWorkTypeAction(id: string): Promise<WorkTypeActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("work_types")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "업무 타입 비활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 업무 타입입니다." };
  }

  revalidatePath(WORK_TYPES_PATH);
  return { success: true };
}

export async function restoreWorkTypeAction(id: string): Promise<WorkTypeActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("work_types")
    .update({ archived_at: null })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "업무 타입 활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 업무 타입입니다." };
  }

  revalidatePath(WORK_TYPES_PATH);
  return { success: true };
}

// work_type은 weekly_logs의 FK가 아니라 배열에 텍스트로 저장되는 값이라 참조 무결성을
// DB가 대신 지켜주지 않는다 — 삭제 전에 직접 참조 건수를 세어 차단한다. UI가 이미 참조
// 건수 > 0이면 삭제 버튼을 비활성화하므로 여기서는 경합 상황에 대한 방어선 역할만 한다.
export async function deleteWorkTypeAction(
  id: string,
  name: string,
): Promise<WorkTypeActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { count: logCount } = await supabase
    .from("weekly_logs")
    .select("id", { count: "exact", head: true })
    .contains("work_type", [name]);

  if ((logCount ?? 0) > 0) {
    return {
      success: false,
      error: `업무일지 ${logCount}건에서 사용 중인 업무 타입은 삭제할 수 없습니다. 비활성화를 이용해주세요.`,
    };
  }

  const { data: deleted, error } = await supabase
    .from("work_types")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: toActionError(error, "업무 타입 삭제 중 오류가 발생했습니다.") };
  }
  if (!deleted) {
    return { success: false, error: "권한이 없거나 존재하지 않는 업무 타입입니다." };
  }

  revalidatePath(WORK_TYPES_PATH);
  return { success: true };
}
