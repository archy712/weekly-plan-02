"use server";

import { revalidatePath } from "next/cache";

import { requireAuthorProfile } from "@/lib/actions/weekly-log";
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  WEEKLY_LOG_ATTACHMENTS_BUCKET,
} from "@/lib/storage/weekly-log-attachments";
import { createClient } from "@/lib/supabase/server";
import type { WeeklyLogAttachment } from "@/lib/types";

export type WeeklyLogAttachmentActionResult =
  | { success: true; attachment: WeeklyLogAttachment }
  | { success: false; error: string };

export type WeeklyLogAttachmentDeleteResult =
  | { success: true }
  | { success: false; error: string };

// 클라이언트가 storage 업로드까지 마친 뒤 메타데이터 행을 등록한다.
// 실제 파일 쓰기 권한은 storage RLS가 이미 검증했으므로, 여기서는 메타데이터 저장 권한만 다시 확인한다.
export async function createWeeklyLogAttachmentAction(
  weeklyLogId: string,
  meta: { fileName: string; filePath: string; fileSize: number; contentType: string | null },
): Promise<WeeklyLogAttachmentActionResult> {
  if (meta.fileSize <= 0 || meta.fileSize > MAX_ATTACHMENT_SIZE_BYTES) {
    return { success: false, error: "첨부파일은 5MB 이하만 업로드할 수 있습니다." };
  }

  const supabase = await createClient();
  const author = await requireAuthorProfile(supabase);
  if ("error" in author) {
    return { success: false, error: author.error };
  }

  const { data, error } = await supabase
    .from("weeklyplan_weekly_log_attachments")
    .insert({
      weekly_log_id: weeklyLogId,
      department_id: author.departmentId,
      file_name: meta.fileName,
      file_path: meta.filePath,
      file_size: meta.fileSize,
      content_type: meta.contentType,
      uploaded_by: author.userId,
    })
    .select("id, file_name, file_path, file_size, content_type, created_at")
    .single();

  if (error || !data) {
    return { success: false, error: "첨부파일 정보 저장 중 오류가 발생했습니다." };
  }

  revalidatePath(`/protected/weekly-logs/${weeklyLogId}`);
  return { success: true, attachment: data };
}

export async function deleteWeeklyLogAttachmentAction(
  attachmentId: string,
  filePath: string,
): Promise<WeeklyLogAttachmentDeleteResult> {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data: deleted, error } = await supabase
    .from("weeklyplan_weekly_log_attachments")
    .delete()
    .eq("id", attachmentId)
    .select("id, weekly_log_id")
    .maybeSingle();

  if (error) {
    return { success: false, error: "첨부파일 삭제 중 오류가 발생했습니다." };
  }
  // RLS가 타 부서 행을 걸러내므로 존재하지 않거나 권한이 없으면 0건이 반환된다.
  if (!deleted) {
    return { success: false, error: "삭제 권한이 없거나 존재하지 않는 첨부파일입니다." };
  }

  // storage 객체 삭제는 부수 작업 — 실패해도 메타데이터는 이미 삭제되었으므로 에러로 취급하지 않는다.
  await supabase.storage.from(WEEKLY_LOG_ATTACHMENTS_BUCKET).remove([filePath]);

  revalidatePath(`/protected/weekly-logs/${deleted.weekly_log_id}`);
  return { success: true };
}
