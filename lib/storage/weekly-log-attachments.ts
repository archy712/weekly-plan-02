import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export const WEEKLY_LOG_ATTACHMENTS_BUCKET = "weekly-log-attachments";
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — 버킷 file_size_limit·DB check 제약과 동일

// storage RLS가 (storage.foldername(name))[1] = 소속 부서 id 로 쓰기 권한을 검사하므로
// 경로의 최상위 폴더는 반드시 department_id여야 한다.
export function buildAttachmentPath(
  departmentId: string,
  weeklyLogId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-가-힣 ]/g, "_");
  return `${departmentId}/${weeklyLogId}/${crypto.randomUUID()}-${safeName}`;
}

export class AttachmentUploadError extends Error {}

// supabase-js의 upload()는 fetch 기반이라 진행률 이벤트를 제공하지 않는다.
// createSignedUploadUrl로 얻은 (토큰이 포함된) URL에 직접 XHR PUT을 보내
// xhr.upload.onprogress로 실제 업로드 진행률을 추적한다.
export function uploadAttachmentWithProgress({
  supabase,
  path,
  file,
  onProgress,
  signal,
}: {
  supabase: SupabaseClient<Database>;
  path: string;
  file: File;
  onProgress: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const { data, error } = await supabase.storage
        .from(WEEKLY_LOG_ATTACHMENTS_BUCKET)
        .createSignedUploadUrl(path);

      if (error || !data) {
        reject(new AttachmentUploadError(error?.message ?? "업로드 URL 생성에 실패했습니다."));
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", data.signedUrl, true);
      xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
      xhr.setRequestHeader("cache-control", "max-age=3600");
      xhr.setRequestHeader("x-upsert", "false");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          reject(new AttachmentUploadError(`업로드에 실패했습니다. (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new AttachmentUploadError("네트워크 오류로 업로드에 실패했습니다."));
      xhr.onabort = () => reject(new AttachmentUploadError("업로드가 취소되었습니다."));

      if (signal) {
        if (signal.aborted) {
          xhr.abort();
          return;
        }
        signal.addEventListener("abort", () => xhr.abort());
      }

      xhr.send(file);
    })().catch(reject);
  });
}

// bucket이 private이므로 다운로드에는 항상 서명된 URL이 필요하다 (짧은 만료 시간으로 매번 새로 발급).
export async function getAttachmentDownloadUrl(
  supabase: SupabaseClient<Database>,
  filePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(WEEKLY_LOG_ATTACHMENTS_BUCKET)
    .createSignedUrl(filePath, 60);
  if (error || !data) return null;
  return data.signedUrl;
}
