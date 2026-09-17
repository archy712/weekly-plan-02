"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type WeeklyLogTransferActionResult =
  | { success: true }
  | { success: false; error: string };

// 이관 사유는 선택 입력이다 — DB CHECK 제약(200자)과 값 범위를 맞춘다.
const transferSchema = z.object({
  logId: z.string().uuid(),
  toProfileId: z.string().uuid(),
  note: z.string().max(200, "이관 사유는 최대 200자까지 입력할 수 있습니다.").optional(),
});

// transfer_weekly_log() RPC가 던지는 예외는 전부 그대로 사용자에게 보여줄 수 있는 한국어
// 메시지다(user-admin.ts가 prevent_unauthorized_role_change 트리거 메시지를 그대로 쓰는 것과
// 동일한 판단). PostgREST는 RAISE EXCEPTION을 P0001로 전달한다.
const TRIGGER_VIOLATION = "P0001";
const RLS_VIOLATION = "42501";

/**
 * 진행업무 오너십 이관(F063). 관리자 이상만 호출할 수 있고 여러 번 반복할 수 있다.
 *
 * 실제 쓰기는 전부 transfer_weekly_log() RPC 한 번으로 처리한다 — author_id와
 * department_id를 함께 옮기는 것, 이력·알림을 남기는 것이 한 트랜잭션에서 끝나야 하기
 * 때문이다(담당자만 바꾸고 팀을 그대로 두면 새 담당자가 팀 기준 RLS 때문에 자기 업무를
 * 수정조차 할 수 없다). 권한·조직 범위 검증도 RPC 안에 있다 — 서버 액션을 거치지 않고
 * PostgREST로 직접 호출될 수 있으므로 SQL이 최종 방어선이어야 한다.
 */
export async function transferWeeklyLogAction(
  logId: string,
  toProfileId: string,
  note?: string,
): Promise<WeeklyLogTransferActionResult> {
  const parsed = transferSchema.safeParse({ logId, toProfileId, note });
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

  const trimmedNote = parsed.data.note?.trim();

  const { error } = await supabase.rpc("transfer_weekly_log", {
    target_log_id: parsed.data.logId,
    new_author_id: parsed.data.toProfileId,
    transfer_note: trimmedNote ? trimmedNote : undefined,
  });

  if (error) {
    if (error.code === TRIGGER_VIOLATION) {
      return { success: false, error: error.message };
    }
    if (error.code === RLS_VIOLATION) {
      return { success: false, error: "권한이 없습니다." };
    }
    console.error("[lib/actions/weekly-log-transfer] 이관 실패:", error);
    return { success: false, error: "이관 중 오류가 발생했습니다." };
  }

  // 이관은 담당자·소속 팀이 함께 바뀌어 목록/칸반/타임라인의 필터 결과 자체가 달라지므로
  // 세 뷰를 모두 무효화한다(작성·수정·삭제와 동일, weekly-log.ts의 revalidateWeeklyLogViews 참고).
  revalidatePath("/protected/weekly-logs");
  revalidatePath("/protected/weekly-logs/kanban");
  revalidatePath("/protected/weekly-logs/timeline");
  revalidatePath(`/protected/weekly-logs/${parsed.data.logId}`);
  return { success: true };
}
