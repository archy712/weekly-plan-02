"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { weeklyLogSchema, type WeeklyLogFormData } from "@/lib/schemas/weekly-log";

export type WeeklyLogActionResult =
  | { success: true }
  | { success: false; error: string };

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
    ...parsed.data,
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
    .update(parsed.data)
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

export async function toggleWeeklyLogCompletionAction(
  id: string,
  isCompleted: boolean,
): Promise<WeeklyLogActionResult> {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data: updated, error } = await supabase
    .from("weekly_logs")
    .update({ is_completed: isCompleted })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "완료 상태 변경 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "변경 권한이 없거나 존재하지 않는 항목입니다." };
  }

  revalidatePath("/protected/weekly-logs");
  revalidatePath(`/protected/weekly-logs/${id}`);
  return { success: true };
}
