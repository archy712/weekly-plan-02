"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { sanitizeCommentContent } from "@/lib/sanitize-html-server";
import { commentSchema, type CommentFormData } from "@/lib/schemas/comment";

export type CommentActionResult = { success: true } | { success: false; error: string };

export type CreateCommentActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

// 멘션 입력 UI(Task 033)가 본문에 삽입하는 토큰 형식: @[이메일](uuid)
const MENTION_TOKEN_PATTERN = /@\[[^\]]*\]\(([0-9a-fA-F-]{36})\)/g;

function extractMentionedUserIds(content: string): string[] {
  const ids = new Set<string>();
  for (const match of content.matchAll(MENTION_TOKEN_PATTERN)) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
}

async function requireLoggedIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { error: "로그인이 필요합니다." };
  }
  return { userId: data.claims.sub };
}

// 댓글은 weekly_logs와 달리 부서 무관하게 작성자 본인이면 INSERT가 허용되므로
// (마이그레이션 create_weekly_log_comments_and_mentions 참고), 여기서는 로그인
// 여부만 확인하고 부서 게이트는 걸지 않는다.
export async function createCommentAction(
  weeklyLogId: string,
  values: CommentFormData,
  parentCommentId: string | null = null,
): Promise<CreateCommentActionResult> {
  const parsed = commentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const content = sanitizeCommentContent(parsed.data.content);

  const { data: inserted, error } = await supabase
    .from("weeklyplan_weekly_log_comments")
    .insert({
      weekly_log_id: weeklyLogId,
      author_id: auth.userId,
      content,
      parent_comment_id: parentCommentId,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { success: false, error: "댓글 저장 중 오류가 발생했습니다." };
  }

  // 클라이언트가 보낸 멘션 목록을 신뢰하지 않고, 저장된 본문에서 서버가 직접 토큰을
  // 파싱해 실존하는 profiles.id만 대상으로 삽입한다. 존재하지 않는 id는 조용히 무시된다.
  const candidateIds = extractMentionedUserIds(content);
  if (candidateIds.length > 0) {
    // profiles_select_own_or_admin이 본인/관리자 행만 허용하므로, 일반 사용자가 멘션한
    // 타인의 id는 평범한 .from("weeklyplan_profiles") 조회로는 존재 여부를 확인할 수 없다(RLS가
    // 조용히 0건으로 걸러냄). get_profile_identities는 이 목적을 위해 만든 SECURITY
    // DEFINER RPC라 RLS와 무관하게 실존 여부를 정확히 판별한다(Task 033).
    const { data: existingProfiles } = await supabase.rpc("weeklyplan_get_profile_identities", {
      profile_ids: candidateIds,
    });

    const mentionRows = (existingProfiles ?? []).map((profile) => ({
      comment_id: inserted.id,
      mentioned_user_id: profile.id,
    }));

    if (mentionRows.length > 0) {
      await supabase.from("weeklyplan_weekly_log_comment_mentions").insert(mentionRows);
    }
  }

  revalidatePath(`/protected/weekly-logs/${weeklyLogId}`);
  return { success: true, id: inserted.id };
}

export async function updateCommentAction(
  id: string,
  weeklyLogId: string,
  values: CommentFormData,
): Promise<CommentActionResult> {
  const parsed = commentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("weeklyplan_weekly_log_comments")
    .update({ content: sanitizeCommentContent(parsed.data.content) })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "댓글 수정 중 오류가 발생했습니다." };
  }
  // RLS(작성자 본인 또는 is_admin())가 걸러내므로 존재하지 않거나 권한이 없으면 0건.
  if (!updated) {
    return { success: false, error: "수정 권한이 없거나 존재하지 않는 댓글입니다." };
  }

  revalidatePath(`/protected/weekly-logs/${weeklyLogId}`);
  return { success: true };
}

// 물리 삭제(DELETE)가 아니라 소프트 삭제(UPDATE)를 사용한다 — 대댓글이 달린 댓글을
// 물리 삭제하면 스레드가 끊기기 때문. deleted_at이 채워진 댓글은 UI에서
// "삭제된 댓글입니다"로 렌더링하고 대댓글은 그대로 유지한다.
export async function deleteCommentAction(
  id: string,
  weeklyLogId: string,
): Promise<CommentActionResult> {
  const supabase = await createClient();
  const auth = await requireLoggedIn(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: updated, error } = await supabase
    .from("weeklyplan_weekly_log_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "댓글 삭제 중 오류가 발생했습니다." };
  }
  if (!updated) {
    return { success: false, error: "삭제 권한이 없거나 존재하지 않는 댓글입니다." };
  }

  revalidatePath(`/protected/weekly-logs/${weeklyLogId}`);
  return { success: true };
}
