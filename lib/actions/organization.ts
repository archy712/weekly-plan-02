"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { organizationSchema, type OrganizationFormData } from "@/lib/schemas/organization";

export type OrganizationActionResult =
  | { success: true }
  | { success: false; error: string };

const ORGANIZATIONS_PATH = "/protected/admin/organizations";

// Postgres 오류 코드 (supabase-js는 PostgrestError.code에 문자열로 담아 전달한다).
const UNIQUE_VIOLATION = "23505";
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

// 조직명 중복(23505)은 raw 에러를 그대로 노출하지 않고 한국어 메시지로 변환한다. RLS
// 위반은 organizations_update_admin(일반 관리자는 자기 소속 조직 밖) 또는
// organizations_insert_superadmin(슈퍼관리자가 아님) 정책에 걸린 경우다 — 삭제는
// 여전히 정책 자체가 없어(소프트 삭제만 지원) 액션도 제공하지 않는다.
function toActionError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === UNIQUE_VIOLATION) {
    return "이미 존재하는 조직명입니다.";
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

  const { error } = await supabase.from("organizations").insert({ name: parsed.data.name });

  if (error) {
    return {
      success: false,
      error: toActionError(error, "조직 생성 중 오류가 발생했습니다."),
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
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: toActionError(error, "조직명 수정 중 오류가 발생했습니다."),
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
