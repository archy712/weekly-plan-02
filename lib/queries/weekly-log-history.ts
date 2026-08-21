import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { WeeklyLogChangeHistoryField, WeeklyLogChangeHistoryItem } from "@/lib/types";

type AnySupabaseClient = SupabaseClient<Database>;

// 최소 버전 이력이라 "더보기" 페이지네이션 없이 최근 N건만 보여준다(상세 페이지 접이식
// 섹션은 scroll 컨테이너로 감싸 50건이어도 레이아웃이 무너지지 않게 한다).
const HISTORY_PAGE_SIZE = 50;

// weekly_log_change_history는 SELECT만 전 인증 사용자 공개(weekly_logs와 동일 원칙)라
// department_id 필터 없이 조회한다. 변경자 신원은 profiles_select_own_or_admin RLS 때문에
// embed로 타인 정보를 못 가져와 get_profile_identities RPC로 배치 조회한다
// (lib/queries/notifications.ts·comments.ts와 동일 패턴).
export async function getWeeklyLogChangeHistory(
  supabase: AnySupabaseClient,
  weeklyLogId: string,
): Promise<WeeklyLogChangeHistoryItem[]> {
  const { data: rows, error } = await supabase
    .from("weekly_log_change_history")
    .select("id, weekly_log_id, changed_by, field, old_value, new_value, created_at")
    .eq("weekly_log_id", weeklyLogId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_PAGE_SIZE);

  if (error) {
    console.error("[lib/queries/weekly-log-history] 변경 이력 조회 실패:", error);
    return [];
  }
  if (!rows || rows.length === 0) return [];

  const changerIds = [
    ...new Set(rows.map((row) => row.changed_by).filter((id): id is string => id !== null)),
  ];

  const { data: identities, error: identitiesError } =
    changerIds.length > 0
      ? await supabase.rpc("get_profile_identities", { profile_ids: changerIds })
      : { data: [], error: null };

  if (identitiesError) {
    console.error(
      "[lib/queries/weekly-log-history] get_profile_identities 조회 실패:",
      identitiesError,
    );
  }

  const identityMap = new Map((identities ?? []).map((identity) => [identity.id, identity]));

  return rows.map((row) => {
    const changer = row.changed_by ? identityMap.get(row.changed_by) : undefined;
    return {
      id: row.id,
      weekly_log_id: row.weekly_log_id,
      changed_by: row.changed_by,
      field: row.field as WeeklyLogChangeHistoryField,
      old_value: row.old_value,
      new_value: row.new_value,
      created_at: row.created_at,
      changed_by_name: changer?.name ?? null,
      changed_by_email: changer?.email ?? null,
    };
  });
}
