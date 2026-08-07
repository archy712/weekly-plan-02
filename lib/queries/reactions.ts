import { createClient } from "@/lib/supabase/server";
import type { WeeklyLogReactionKind, WeeklyLogReactionSummary } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

// F031 추천/비추천 집계. 명단은 공개하지 않으므로(익명 집계 결정) 화면에는 건수와
// "내 반응"만 노출한다 — 조회 자체는 weekly_log_reactions SELECT 공개(전 인증 사용자) 위에서
// 이뤄지고, user_id는 my_reaction 판정에만 쓰고 밖으로 내보내지 않는다.

// 상세 페이지·서버 액션이 쓰는 단건 집계. 로그 1건의 up/down 건수와 로그인 사용자의
// 내 반응(없으면 null)을 함께 반환한다.
export async function getWeeklyLogReactionSummary(
  supabase: Client,
  weeklyLogId: string,
  userId: string | null,
): Promise<WeeklyLogReactionSummary> {
  const { data: rows, error } = await supabase
    .from("weeklyplan_weekly_log_reactions")
    .select("reaction, user_id")
    .eq("weekly_log_id", weeklyLogId);

  if (error) {
    console.error("[lib/queries/reactions] weekly_log_reactions 단건 집계 실패:", error);
    return { up: 0, down: 0, my_reaction: null };
  }

  let up = 0;
  let down = 0;
  let myReaction: WeeklyLogReactionKind | null = null;
  for (const row of rows ?? []) {
    if (row.reaction === "up") up += 1;
    else if (row.reaction === "down") down += 1;
    if (userId && row.user_id === userId) {
      myReaction = row.reaction as WeeklyLogReactionKind;
    }
  }
  return { up, down, my_reaction: myReaction };
}

// 목록 페이지용 배치 집계(댓글수 2차 조회와 동일 패턴). 목록에는 상호작용이 없어 익명
// 건수만 필요하므로 my_reaction은 담지 않는다 — Map<weekly_log_id, {up, down}>.
export async function getReactionCountsForLogs(
  supabase: Client,
  logIds: string[],
): Promise<Map<string, { up: number; down: number }>> {
  const counts = new Map<string, { up: number; down: number }>();
  if (logIds.length === 0) return counts;

  const { data: rows, error } = await supabase
    .from("weeklyplan_weekly_log_reactions")
    .select("weekly_log_id, reaction")
    .in("weekly_log_id", logIds);

  if (error) {
    console.error("[lib/queries/reactions] weekly_log_reactions 목록 집계 실패:", error);
    return counts;
  }

  for (const row of rows ?? []) {
    const entry = counts.get(row.weekly_log_id) ?? { up: 0, down: 0 };
    if (row.reaction === "up") entry.up += 1;
    else if (row.reaction === "down") entry.down += 1;
    counts.set(row.weekly_log_id, entry);
  }
  return counts;
}
