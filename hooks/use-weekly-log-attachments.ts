"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createWeeklyLogAttachmentAction,
  deleteWeeklyLogAttachmentAction,
} from "@/lib/actions/weekly-log-attachments";
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  buildAttachmentPath,
  uploadAttachmentWithProgress,
} from "@/lib/storage/weekly-log-attachments";
import { createClient } from "@/lib/supabase/client";
import { formatFileSize } from "@/lib/format";
import type { WeeklyLogAttachment } from "@/lib/types";

export type PendingAttachment = {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "error";
  error?: string;
};

export function useWeeklyLogAttachments(initialAttachments: WeeklyLogAttachment[] = []) {
  const supabase = useMemo(() => createClient(), []);
  const [attachments, setAttachments] = useState<WeeklyLogAttachment[]>(initialAttachments);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const accepted: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        toast.error(`${file.name} — 첨부파일은 ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)} 이하만 업로드할 수 있습니다.`);
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file, progress: 0, status: "pending" });
    }
    if (accepted.length > 0) {
      setPendingFiles((prev) => [...prev, ...accepted]);
    }
  }, []);

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 성공/실패를 boolean으로 반환한다 — uploadAll이 Promise.all 결과에서 바로 실패 개수를 셀 수 있어야
  // 호출 직후 (아직 리렌더되지 않아 값이 오래된) pendingFiles state를 다시 읽지 않아도 된다.
  const uploadOne = useCallback(
    async (item: PendingAttachment, weeklyLogId: string, departmentId: string): Promise<boolean> => {
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", progress: 0, error: undefined } : f)),
      );

      try {
        const path = buildAttachmentPath(departmentId, weeklyLogId, item.file.name);
        await uploadAttachmentWithProgress({
          supabase,
          path,
          file: item.file,
          onProgress: (percent) => {
            setPendingFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress: percent } : f)));
          },
        });

        const result = await createWeeklyLogAttachmentAction(weeklyLogId, {
          fileName: item.file.name,
          filePath: path,
          fileSize: item.file.size,
          contentType: item.file.type || null,
        });

        if (!result.success) {
          setPendingFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: "error", error: result.error } : f)),
          );
          return false;
        }

        setAttachments((prev) => [...prev, result.attachment]);
        setPendingFiles((prev) => prev.filter((f) => f.id !== item.id));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.";
        setPendingFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "error", error: message } : f)));
        return false;
      }
    },
    [supabase],
  );

  // 새로 선택된 파일의 실제 업로드는 주간업무일지 저장(생성/수정) 성공 이후에 실행된다.
  // 생성 시점에는 storage 경로에 필요한 weekly_log_id가 저장 전까지 존재하지 않기 때문이다.
  const uploadAll = useCallback(
    async (weeklyLogId: string, departmentId: string): Promise<{ failedCount: number }> => {
      const targets = pendingFiles.filter((f) => f.status === "pending" || f.status === "error");
      const results = await Promise.all(targets.map((item) => uploadOne(item, weeklyLogId, departmentId)));
      return { failedCount: results.filter((ok) => !ok).length };
    },
    [pendingFiles, uploadOne],
  );

  const retryUpload = useCallback(
    (id: string, weeklyLogId: string, departmentId: string) => {
      const item = pendingFiles.find((f) => f.id === id);
      if (item) void uploadOne(item, weeklyLogId, departmentId);
    },
    [pendingFiles, uploadOne],
  );

  const removeExistingAttachment = useCallback(async (attachment: WeeklyLogAttachment) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    const result = await deleteWeeklyLogAttachmentAction(attachment.id, attachment.file_path);
    if (!result.success) {
      setAttachments((prev) => [...prev, attachment]);
      toast.error(result.error);
    }
  }, []);

  const hasPendingUploads = pendingFiles.length > 0;

  return {
    attachments,
    pendingFiles,
    hasPendingUploads,
    addFiles,
    removePendingFile,
    uploadAll,
    retryUpload,
    removeExistingAttachment,
  };
}
