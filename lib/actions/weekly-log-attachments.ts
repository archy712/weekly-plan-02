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
//
// weekly_log_attachments의 INSERT RLS(department_id = current_department_id() AND
// uploaded_by = auth.uid())는 이 행 자체의 컬럼값만 검사할 뿐, weekly_log_id가 실제로 그
// department_id 소속 로그인지는 검사하지 못한다(테이블 간 EXISTS 서브쿼리 없음) — 호출자가
// 자기 부서 department_id를 그대로 넣으면서 weekly_log_id만 다른 부서의 것으로 바꿔 보내면
// RLS를 그대로 통과한다. 그래서 weekly_logs.department_id를 서버에서 직접 조회해 재검증한다.
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

  const { data: log, error: logError } = await supabase
    .from("weekly_logs")
    .select("department_id")
    .eq("id", weeklyLogId)
    .maybeSingle();

  if (logError || !log) {
    return { success: false, error: "존재하지 않는 진행업무입니다." };
  }

  if (log.department_id !== author.departmentId) {
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", author.userId)
      .maybeSingle();
    if (callerProfile?.role !== "admin" && callerProfile?.role !== "superadmin") {
      return { success: false, error: "첨부파일을 추가할 권한이 없습니다." };
    }
  }

  // filePath가 실제로 이 진행업무를 위해 발급된 storage 경로(buildAttachmentPath의
  // `{department_id}/{weekly_log_id}/...` 형식)를 가리키는지 확인한다. department_id/
  // weekly_log_id는 둘 다 UUID라 "/"를 포함할 수 없으므로 접두사 비교만으로 다른 로그·다른
  // 부서 경로를 가리키는 임의 문자열을 걸러내기에 충분하다.
  const expectedPathPrefix = `${log.department_id}/${weeklyLogId}/`;
  if (!meta.filePath.startsWith(expectedPathPrefix)) {
    return { success: false, error: "첨부파일 경로가 올바르지 않습니다." };
  }

  const { data, error } = await supabase
    .from("weekly_log_attachments")
    .insert({
      weekly_log_id: weeklyLogId,
      // author.departmentId가 아니라 로그 자체의 department_id를 저장해야 관리자가 타 부서
      // 로그에 첨부할 때도(storage 경로도 log.department_id 기준으로 이미 구성됨, 위
      // hooks/use-weekly-log-attachments.ts 참고) 메타데이터가 실제 소속과 어긋나지 않는다.
      department_id: log.department_id,
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
    .from("weekly_log_attachments")
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
