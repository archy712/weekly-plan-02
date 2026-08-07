"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type NotificationActionResult = { success: true } | { success: false; error: string };

async function requireLoggedIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { error: "로그인이 필요합니다." };
  }
  return { userId: data.claims.sub };
}

// notifications는 recipient_id 기준 RLS만 있고(부서 무관, 알림은 개인 데이터) INSERT 정책이
// 아예 없어 클라이언트가 직접 행을 만들 수 없다(Task 034) — 아래 세 액션은 모두 이미 존재하는
// 행의 read_at을 갱신하거나 삭제하는 것만 담당한다. RLS(recipient_id = auth.uid())가 본인
// 알림이 아닌 행을 조용히 0건으로 걸러내므로, 여기서는 별도로 recipient_id를 재확인하지 않고
// UPDATE/DELETE 결과 행 수로 권한 여부를 판단한다(weekly-log-comment.ts와 동일한 패턴).
export async function markNotificationReadAction(id: string): Promise<NotificationActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("weeklyplan_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "알림 읽음 처리 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "존재하지 않거나 권한이 없는 알림입니다." };
  }

  revalidatePath("/protected", "layout");
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  // recipient_id는 RLS(recipient_id = auth.uid())로 이미 본인 행만 대상이 되지만, UPDATE 문에는
  // WHERE 절이 필요하므로 명시적으로 조건을 건다(읽지 않은 알림만 대상, 이미 읽은 행은 건드리지 않음).
  const { error } = await supabase
    .from("weeklyplan_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", auth.userId)
    .is("read_at", null);

  if (error) {
    return { success: false, error: "전체 읽음 처리 중 오류가 발생했습니다." };
  }

  revalidatePath("/protected", "layout");
  return { success: true };
}

export async function deleteNotificationAction(id: string): Promise<NotificationActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: deleted, error } = await supabase
    .from("weeklyplan_notifications")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "알림 삭제 중 오류가 발생했습니다." };
  }
  if (!deleted) {
    return { success: false, error: "존재하지 않거나 권한이 없는 알림입니다." };
  }

  revalidatePath("/protected", "layout");
  return { success: true };
}
