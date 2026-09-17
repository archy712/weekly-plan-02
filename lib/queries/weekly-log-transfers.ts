import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { WeeklyLogTransferItem } from "@/lib/types";

type AnySupabaseClient = SupabaseClient<Database>;

// 변경 이력(weekly-log-history.ts)과 동일하게 "더보기" 없이 최근 N건만 보여준다. 이관은
// 변경 이력보다 훨씬 드물게 일어나므로 상한이 문제되는 경우는 사실상 없다.
const TRANSFERS_PAGE_SIZE = 50;

// weekly_log_transfers는 SELECT만 전 인증 사용자 공개(weekly_logs·변경 이력과 동일 원칙)라
// department_id 필터 없이 조회한다. 팀 이름은 departments가 전 사용자 공개라 embed로 바로
// 가져올 수 있지만(같은 테이블을 두 번 참조하므로 FK 이름 힌트 필수), 사람 신원은
// profiles_select_own_or_admin RLS 때문에 embed가 불가능해 get_profile_identities RPC로
// 배치 조회한다(댓글·알림·변경 이력과 동일 패턴).
export async function getWeeklyLogTransfers(
  supabase: AnySupabaseClient,
  weeklyLogId: string,
): Promise<WeeklyLogTransferItem[]> {
  const { data: rows, error } = await supabase
    .from("weekly_log_transfers")
    .select(
      "id, weekly_log_id, from_profile_id, to_profile_id, from_department_id, to_department_id, transferred_by, note, created_at, from_department:departments!weekly_log_transfers_from_department_id_fkey(name), to_department:departments!weekly_log_transfers_to_department_id_fkey(name)",
    )
    .eq("weekly_log_id", weeklyLogId)
    .order("created_at", { ascending: false })
    .limit(TRANSFERS_PAGE_SIZE);

  if (error) {
    console.error("[lib/queries/weekly-log-transfers] 이관 이력 조회 실패:", error);
    return [];
  }
  if (!rows || rows.length === 0) return [];

  // 한 행에 최대 3명(이전 담당자·새 담당자·이관 수행자)이 등장하므로 전부 모아 한 번에 조회한다.
  const profileIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.from_profile_id, row.to_profile_id, row.transferred_by])
        .filter((id): id is string => id !== null),
    ),
  ];

  const { data: identities, error: identitiesError } =
    profileIds.length > 0
      ? await supabase.rpc("get_profile_identities", { profile_ids: profileIds })
      : { data: [], error: null };

  if (identitiesError) {
    console.error(
      "[lib/queries/weekly-log-transfers] get_profile_identities 조회 실패:",
      identitiesError,
    );
  }

  const identityMap = new Map((identities ?? []).map((identity) => [identity.id, identity]));

  return rows.map((row) => {
    const from = row.from_profile_id ? identityMap.get(row.from_profile_id) : undefined;
    const to = row.to_profile_id ? identityMap.get(row.to_profile_id) : undefined;
    const by = row.transferred_by ? identityMap.get(row.transferred_by) : undefined;
    return {
      id: row.id,
      weekly_log_id: row.weekly_log_id,
      from_profile_id: row.from_profile_id,
      to_profile_id: row.to_profile_id,
      from_department_id: row.from_department_id,
      to_department_id: row.to_department_id,
      transferred_by: row.transferred_by,
      note: row.note,
      created_at: row.created_at,
      from_name: from?.name ?? null,
      from_email: from?.email ?? null,
      to_name: to?.name ?? null,
      to_email: to?.email ?? null,
      to_avatar_key: to?.avatar_key ?? "fox",
      transferred_by_name: by?.name ?? null,
      transferred_by_email: by?.email ?? null,
      from_department_name: row.from_department?.name ?? null,
      to_department_name: row.to_department?.name ?? null,
    };
  });
}
