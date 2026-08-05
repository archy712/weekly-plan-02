"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type UserAdminActionResult =
  | { success: true }
  | { success: false; error: string };

const USERS_LIST_PATH = "/protected/admin/users";

// prevent_unauthorized_role_change() 트리거가 자기 상승/마지막 관리자 강등을 막을 때
// 던지는 예외 코드. Postgres RAISE EXCEPTION은 SQLSTATE가 없으면 기본값 P0001을 쓴다.
const TRIGGER_VIOLATION = "P0001";
const RLS_VIOLATION = "42501";

async function requireCallerAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ callerId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { error: "로그인이 필요합니다." };
  }

  const callerId = data.claims.sub;

  // 클라이언트가 보낸 role은 신뢰하지 않고, 호출자의 role을 항상 DB에서 재조회한다.
  // getClaims()는 JWT 로컬 디코딩이라 role 변경이 즉시 반영되지 않을 수 있어
  // 관리자 여부 판단에는 절대 쓰지 않는다(CLAUDE.md 관례).
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();

  if (callerProfile?.role !== "admin") {
    return { error: "권한이 없습니다." };
  }

  return { callerId };
}

// 트리거(prevent_unauthorized_role_change)가 던지는 예외는 이미 자연스러운 한국어
// 메시지("권한이 없습니다: role은 관리자만 변경할 수 있습니다.", "마지막 남은 관리자는
// 강등할 수 없습니다.")이므로 raw 메시지를 그대로 사용자에게 보여준다. RLS 위반은
// profiles_update_own_or_admin 정책에 걸린 경우로, 이 액션은 이미 호출자가 관리자인지
// 재확인한 뒤라 정상 흐름에서는 도달하지 않지만 방어적으로 처리한다.
function toActionError(
  error: { code?: string; message: string },
  fallback: string,
): string {
  if (error.code === TRIGGER_VIOLATION) {
    return error.message;
  }
  if (error.code === RLS_VIOLATION) {
    return "권한이 없습니다.";
  }
  return fallback;
}

export async function updateUserRoleAction(
  userId: string,
  role: UserRole,
): Promise<UserAdminActionResult> {
  if (role !== "user" && role !== "admin") {
    return { success: false, error: "잘못된 역할 값입니다." };
  }

  const supabase = await createClient();
  const auth = await requireCallerAdmin(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  // DB 트리거는 "마지막 관리자 강등"만 항상 차단하고, 관리자가 2명 이상이면 자기 자신을
  // 강등하는 것을 막지 않는다. 로드맵이 요구하는 "자기 자신 강등 방지"는 관리자 수와
  // 무관하게 항상 적용되어야 하므로(UI 비활성화의 이중 방어) 여기서 명시적으로 막는다.
  if (userId === auth.callerId) {
    return { success: false, error: "본인 역할은 변경할 수 없습니다." };
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: toActionError(error, "역할 변경 중 오류가 발생했습니다."),
    };
  }
  if (!updated) {
    return { success: false, error: "존재하지 않는 사용자입니다." };
  }

  revalidatePath(USERS_LIST_PATH);
  revalidatePath(`${USERS_LIST_PATH}/${userId}`);
  return { success: true };
}

export async function updateUserDepartmentAction(
  userId: string,
  departmentId: string,
): Promise<UserAdminActionResult> {
  if (!departmentId) {
    return { success: false, error: "부서를 선택해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireCallerAdmin(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ department_id: departmentId })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: toActionError(error, "소속 부서 변경 중 오류가 발생했습니다."),
    };
  }
  if (!updated) {
    return { success: false, error: "존재하지 않는 사용자입니다." };
  }

  revalidatePath(USERS_LIST_PATH);
  revalidatePath(`${USERS_LIST_PATH}/${userId}`);
  return { success: true };
}
