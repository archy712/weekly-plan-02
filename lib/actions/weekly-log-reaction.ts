"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getWeeklyLogReactionSummary } from "@/lib/queries/reactions";
import type { WeeklyLogReactionKind, WeeklyLogReactionSummary } from "@/lib/types";

const reactionSchema = z.enum(["up", "down"]);

export type ToggleReactionResult =
  | { success: true; summary: WeeklyLogReactionSummary }
  | { success: false; error: string };

// F031 추천/비추천 단일 진입점. 클라이언트가 보낸 카운트는 신뢰하지 않고, 토글 후 서버에서
// 재집계한 결과(summary)를 반환해 화면이 서버 진실로 확정하게 한다.
//
// 토글 규칙(1인 1표, unique(weekly_log_id, user_id)):
//  - 반응 없음 → 새 반응 삽입
//  - 같은 반응 재클릭 → 행 삭제(해제)
//  - 반대 반응 → 기존 행의 reaction 갱신(새 행을 만들지 않는다)
//
// 자기 글 투표는 허용하므로 작성자 여부를 검사하지 않는다. 부서 조건·관리자 예외도 없다 —
// INSERT/UPDATE/DELETE RLS가 모두 user_id = auth.uid()인 본인 행만 허용하므로, 서버 액션이
// 별도로 소유권을 재검증하지 않아도 타인의 반응은 어떤 경로로도 건드릴 수 없다.
export async function toggleWeeklyLogReactionAction(
  weeklyLogId: string,
  reaction: WeeklyLogReactionKind,
): Promise<ToggleReactionResult> {
  const parsedReaction = reactionSchema.safeParse(reaction);
  if (!z.string().uuid().safeParse(weeklyLogId).success || !parsedReaction.success) {
    return { success: false, error: "잘못된 요청입니다." };
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }
  const userId = claims.claims.sub;

  const { data: existing, error: selectError } = await supabase
    .from("weekly_log_reactions")
    .select("id, reaction")
    .eq("weekly_log_id", weeklyLogId)
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    return { success: false, error: "반응 처리 중 오류가 발생했습니다." };
  }

  let writeError: { code?: string } | null = null;
  if (!existing) {
    // weekly_log_id가 존재하지 않으면 FK 위반(23503)으로 실패한다(잘못된 id 방어).
    const { error } = await supabase
      .from("weekly_log_reactions")
      .insert({ weekly_log_id: weeklyLogId, user_id: userId, reaction: parsedReaction.data });
    writeError = error;
  } else if (existing.reaction === parsedReaction.data) {
    const { error } = await supabase
      .from("weekly_log_reactions")
      .delete()
      .eq("id", existing.id);
    writeError = error;
  } else {
    const { error } = await supabase
      .from("weekly_log_reactions")
      .update({ reaction: parsedReaction.data })
      .eq("id", existing.id);
    writeError = error;
  }

  if (writeError) {
    if (writeError.code === "23503") {
      return { success: false, error: "존재하지 않는 진행업무입니다." };
    }
    // 23505(unique 위반)는 버튼 disable 가드를 뚫은 동시 클릭에서만 발생할 수 있다 —
    // 이 경우 재집계 결과를 돌려주면 화면이 서버 진실로 맞춰지므로 성공으로 흘려보내지 않고
    // 일반 오류로 안내해 사용자가 다시 시도하게 한다.
    return { success: false, error: "반응 처리 중 오류가 발생했습니다." };
  }

  const summary = await getWeeklyLogReactionSummary(supabase, weeklyLogId, userId);
  revalidatePath("/protected/weekly-logs");
  revalidatePath(`/protected/weekly-logs/${weeklyLogId}`);
  return { success: true, summary };
}
