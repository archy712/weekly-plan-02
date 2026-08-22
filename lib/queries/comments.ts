import { createClient } from "@/lib/supabase/server";
import type { WeeklyLogComment, WeeklyLogCommentMention } from "@/lib/types";

// 상세 페이지(app/protected/weekly-logs/[id]/page.tsx)의 첨부파일 조회와 동일한 패턴으로
// 확장한다: weekly_log_comments/weekly_log_comment_mentions는 profiles를 직접 embed할 수
// 없다(profiles_select_own_or_admin이 타인의 행을 막으므로) — get_profile_identities RPC로
// 작성자·멘션 대상의 email/이름/아바타만 배치 조회해 붙인다.
export async function getWeeklyLogComments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  weeklyLogId: string,
): Promise<WeeklyLogComment[]> {
  const { data: rows, error } = await supabase
    .from("weekly_log_comments")
    .select("id, weekly_log_id, author_id, content, parent_comment_id, created_at, updated_at, deleted_at")
    .eq("weekly_log_id", weeklyLogId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[lib/queries/comments] weekly_log_comments 조회 실패:", error);
    return [];
  }
  if (!rows || rows.length === 0) {
    return [];
  }

  const { data: mentionRows, error: mentionsError } = await supabase
    .from("weekly_log_comment_mentions")
    .select("comment_id, mentioned_user_id")
    .in(
      "comment_id",
      rows.map((row) => row.id),
    );

  if (mentionsError) {
    console.error("[lib/queries/comments] weekly_log_comment_mentions 조회 실패:", mentionsError);
  }

  const mentionsByComment = new Map<string, string[]>();
  for (const row of mentionRows ?? []) {
    const list = mentionsByComment.get(row.comment_id) ?? [];
    list.push(row.mentioned_user_id);
    mentionsByComment.set(row.comment_id, list);
  }

  const authorIds = rows.map((row) => row.author_id);
  const mentionedIds = (mentionRows ?? []).map((row) => row.mentioned_user_id);
  const identityIds = [...new Set([...authorIds, ...mentionedIds])];

  const { data: identities, error: identitiesError } = await supabase.rpc(
    "get_profile_identities",
    { profile_ids: identityIds },
  );

  if (identitiesError) {
    console.error("[lib/queries/comments] get_profile_identities 조회 실패:", identitiesError);
  }

  const identityMap = new Map((identities ?? []).map((identity) => [identity.id, identity]));

  return rows.map((row) => {
    const author = identityMap.get(row.author_id);
    // 소프트 삭제된 댓글은 UI가 "삭제된 댓글입니다" placeholder로만 렌더링하지만(위
    // weekly-log-comment-section.tsx), content/멘션을 그대로 응답에 담아 보내면 다른
    // 로그인 사용자가 개발자 도구 Network 탭 등으로 삭제된 원문을 열람할 수 있다.
    // deleted_at 컬럼 자체는 감사 목적으로 그대로 두고(물리 삭제 아님), 조회 계층에서만
    // 마스킹한다.
    const isDeleted = row.deleted_at !== null;
    const mentions: WeeklyLogCommentMention[] = isDeleted
      ? []
      : (mentionsByComment.get(row.id) ?? []).map((userId) => {
          const identity = identityMap.get(userId);
          return { id: userId, email: identity?.email ?? null, name: identity?.name ?? null };
        });

    return {
      id: row.id,
      weekly_log_id: row.weekly_log_id,
      author_id: row.author_id,
      content: isDeleted ? "" : row.content,
      parent_comment_id: row.parent_comment_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      author_email: author?.email ?? null,
      author_name: author?.name ?? null,
      author_avatar_key: author?.avatar_key ?? "fox",
      mentions,
    };
  });
}
