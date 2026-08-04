"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { sanitizeWeeklyLogContent } from "@/lib/sanitize-html";
import { weeklyLogSchema, type WeeklyLogFormData } from "@/lib/schemas/weekly-log";
import type { WeeklyLogStatus } from "@/lib/types";

export type WeeklyLogActionResult =
  | { success: true }
  | { success: false; error: string };

// 폼에서는 문자열로 받고(빈 값도 허용), DB 컬럼 타입(number | null, text | null)에 맞춰 변환한다.
// content는 에디터가 만든 HTML을 그대로 신뢰하지 않고 저장 전에 한 번 더 sanitize한다
// (렌더링 시점 sanitize와 별개로, 저장되는 데이터 자체를 안전하게 유지하기 위함).
function toWeeklyLogPayload(data: WeeklyLogFormData) {
  return {
    title: data.title,
    content: sanitizeWeeklyLogContent(data.content),
    start_date: data.start_date,
    target_end_date: data.target_end_date,
    estimated_mm: data.estimated_mm ? Number(data.estimated_mm) : null,
    estimated_cost: data.estimated_cost ? Number(data.estimated_cost) : null,
    partner_company: data.partner_company?.trim() ? data.partner_company.trim() : null,
  };
}

async function requireAuthorProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<
  | { userId: string; departmentId: string }
  | { error: string }
> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { error: "로그인이 필요합니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile?.department_id) {
    return { error: "부서를 먼저 설정해주세요." };
  }

  return { userId: data.claims.sub, departmentId: profile.department_id };
}

export async function createWeeklyLogAction(
  values: WeeklyLogFormData,
): Promise<WeeklyLogActionResult> {
  const parsed = weeklyLogSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const author = await requireAuthorProfile(supabase);
  if ("error" in author) {
    return { success: false, error: author.error };
  }

  // department_id는 폼 입력이 아니라 작성자 프로필 기준으로 서버에서 지정한다.
  const { error } = await supabase.from("weekly_logs").insert({
    ...toWeeklyLogPayload(parsed.data),
    department_id: author.departmentId,
    author_id: author.userId,
  });

  if (error) {
    return { success: false, error: "주간업무일지 저장 중 오류가 발생했습니다." };
  }

  revalidatePath("/protected/weekly-logs");
  return { success: true };
}

export async function updateWeeklyLogAction(
  id: string,
  values: WeeklyLogFormData,
): Promise<WeeklyLogActionResult> {
  const parsed = weeklyLogSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data: updated, error } = await supabase
    .from("weekly_logs")
    .update(toWeeklyLogPayload(parsed.data))
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "주간업무일지 수정 중 오류가 발생했습니다." };
  }
  // RLS가 타 부서 행을 걸러내므로 존재하지 않거나 권한이 없으면 0건이 반환된다.
  if (!updated) {
    return { success: false, error: "수정 권한이 없거나 존재하지 않는 항목입니다." };
  }

  revalidatePath("/protected/weekly-logs");
  revalidatePath(`/protected/weekly-logs/${id}`);
  return { success: true };
}

export async function deleteWeeklyLogAction(id: string): Promise<WeeklyLogActionResult> {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data: deleted, error } = await supabase
    .from("weekly_logs")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "삭제 중 오류가 발생했습니다." };
  }
  if (!deleted) {
    return { success: false, error: "삭제 권한이 없거나 존재하지 않는 항목입니다." };
  }

  revalidatePath("/protected/weekly-logs");
  return { success: true };
}

export async function updateWeeklyLogStatusAction(
  id: string,
  status: WeeklyLogStatus,
): Promise<WeeklyLogActionResult> {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data: updated, error } = await supabase
    .from("weekly_logs")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "진행 상태 변경 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "변경 권한이 없거나 존재하지 않는 항목입니다." };
  }

  revalidatePath("/protected/weekly-logs");
  revalidatePath(`/protected/weekly-logs/${id}`);
  return { success: true };
}
