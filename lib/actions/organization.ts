"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { formatOrganizationDeleteBlockedMessage } from "@/lib/format";
import { organizationSchema, type OrganizationFormData } from "@/lib/schemas/organization";

export type OrganizationActionResult =
  | { success: true }
  | { success: false; error: string };

const ORGANIZATIONS_PATH = "/protected/admin/organizations";

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

// 조직명 중복(23505)은 raw 에러를 그대로 노출하지 않고 한국어 메시지로 변환한다.
// 하드 삭제 시 참조(23503)로 실패하는 경합 상황은 실시간으로 최신 부서 수를 다시 세어
// UI에서 미리 보여주는 안내와 동일한 문구로 폴백한다(department.ts의 동일 패턴 참고).
async function toActionError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  error: { code?: string; message: string },
  organizationId: string | null,
  fallback: string,
): Promise<string> {
  if (error.code === UNIQUE_VIOLATION) {
    return "이미 존재하는 조직명입니다.";
  }
  if (error.code === FOREIGN_KEY_VIOLATION && organizationId) {
    const { count: departmentCount } = await supabase
      .from("departments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);
    return formatOrganizationDeleteBlockedMessage(departmentCount ?? 0);
  }
  if (error.code === RLS_VIOLATION) {
    return "권한이 없습니다.";
  }
  return fallback;
}

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

  const { error } = await supabase.from("organizations").insert({ name: parsed.data.name });

  if (error) {
    return {
      success: false,
      error: await toActionError(supabase, error, null, "조직 추가 중 오류가 발생했습니다."),
    };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  revalidatePath("/protected/admin/departments");
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
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: await toActionError(supabase, error, id, "조직명 수정 중 오류가 발생했습니다."),
    };
  }
  if (!updated) {
    return { success: false, error: "수정 권한이 없거나 존재하지 않는 조직입니다." };
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
    return { success: false, error: "조직 비활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 조직입니다." };
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
    return { success: false, error: "조직 활성화 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "권한이 없거나 존재하지 않는 조직입니다." };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  return { success: true };
}

// 기본 삭제 정책은 비활성화(소프트 삭제)이며, 이 액션은 참조(부서)가 전혀 없을 때만
// UI에서 노출된다. departments.organization_id가 ON DELETE RESTRICT라 부서가 하나라도
// 있으면 하드 삭제는 항상 23503으로 거부된다.
export async function deleteOrganizationAction(id: string): Promise<OrganizationActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: deleted, error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: await toActionError(supabase, error, id, "조직 삭제 중 오류가 발생했습니다."),
    };
  }
  if (!deleted) {
    return { success: false, error: "권한이 없거나 존재하지 않는 조직입니다." };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  return { success: true };
}
