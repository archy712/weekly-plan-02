import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { NotificationListItem, NotificationType } from "@/lib/types";

// 서버 컴포넌트(lib/supabase/server)와 브라우저 클라이언트(lib/supabase/client) 양쪽에서
// 재사용한다 — 헤더의 초기 렌더(SSR)와 hooks/use-notifications.ts의 Realtime 증분 조회
// (신규 INSERT 1건 enrich, 폴백 폴링 시 전체 재조회) 모두 동일한 조립 로직을 쓴다.
type AnySupabaseClient = SupabaseClient<Database>;

type RawNotificationRow = {
  id: string;
  type: string;
  actor_id: string;
  recipient_id: string;
  weekly_log_id: string;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
};

// notifications 원본 행에 발신자 신원(get_profile_identities RPC)과 대상 업무일지 제목을
// 배치 조회해 붙인다. weekly_logs는 "전 부서 공개" SELECT RLS라 일반 조회로 충분하지만,
// profiles는 profiles_select_own_or_admin 때문에 embed로 타인의 이름/아바타를 가져올 수
// 없어 lib/queries/comments.ts와 동일하게 RPC를 거친다.
export async function enrichNotifications(
  supabase: AnySupabaseClient,
  rows: RawNotificationRow[],
): Promise<NotificationListItem[]> {
  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((row) => row.actor_id))];
  const weeklyLogIds = [...new Set(rows.map((row) => row.weekly_log_id))];

  const [{ data: identities, error: identitiesError }, { data: logs, error: logsError }] =
    await Promise.all([
      supabase.rpc("get_profile_identities", { profile_ids: actorIds }),
      supabase.from("weekly_logs").select("id, title").in("id", weeklyLogIds),
    ]);

  if (identitiesError) {
    console.error("[lib/queries/notifications] get_profile_identities 조회 실패:", identitiesError);
  }
  if (logsError) {
    console.error("[lib/queries/notifications] weekly_logs 조회 실패:", logsError);
  }

  const identityMap = new Map((identities ?? []).map((identity) => [identity.id, identity]));
  const titleMap = new Map((logs ?? []).map((log) => [log.id, log.title]));

  return rows.map((row) => {
    const actor = identityMap.get(row.actor_id);
    return {
      id: row.id,
      type: row.type as NotificationType,
      actor_id: row.actor_id,
      recipient_id: row.recipient_id,
      weekly_log_id: row.weekly_log_id,
      comment_id: row.comment_id,
      read_at: row.read_at,
      created_at: row.created_at,
      actor_name: actor?.name ?? null,
      actor_email: actor?.email ?? null,
      actor_avatar_key: actor?.avatar_key ?? "fox",
      weekly_log_title: titleMap.get(row.weekly_log_id) ?? null,
    };
  });
}

// "내 안 읽은 알림" 개수만 빠르게 센다 — notifications_recipient_id_read_at_created_at_idx가
// 커버하는 핫 경로(Task 034 설계).
export async function getUnreadNotificationCount(
  supabase: AnySupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("[lib/queries/notifications] 안 읽은 알림 개수 조회 실패:", error);
    return 0;
  }
  return count ?? 0;
}

// 헤더 드롭다운에 보여줄 최근 알림 N건(기본 10건). recipient_id는 RLS(recipient_id =
// auth.uid())로 이미 본인 행만 대상이 되지만, 쿼리 의도를 명시적으로 남기기 위해
// 조건을 그대로 건다(다른 조회 함수들과 동일한 관례).
export async function getRecentNotifications(
  supabase: AnySupabaseClient,
  userId: string,
  limit = 10,
): Promise<NotificationListItem[]> {
  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, type, actor_id, recipient_id, weekly_log_id, comment_id, read_at, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[lib/queries/notifications] 최근 알림 조회 실패:", error);
    return [];
  }

  return enrichNotifications(supabase, rows ?? []);
}
