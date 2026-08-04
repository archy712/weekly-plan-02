"use client";

import { useId, useMemo, useRef } from "react";
import { Download, Paperclip, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/format";
import { MAX_ATTACHMENT_SIZE_BYTES, getAttachmentDownloadUrl } from "@/lib/storage/weekly-log-attachments";
import { createClient } from "@/lib/supabase/client";
import type { PendingAttachment } from "@/hooks/use-weekly-log-attachments";
import type { WeeklyLogAttachment } from "@/lib/types";

export function WeeklyLogAttachmentField({
  attachments,
  pendingFiles = [],
  onAddFiles,
  onRemovePendingFile,
  onRetryUpload,
  onRemoveAttachment,
  disabled,
}: {
  attachments: WeeklyLogAttachment[];
  pendingFiles?: PendingAttachment[];
  onAddFiles?: (files: FileList) => void;
  onRemovePendingFile?: (id: string) => void;
  onRetryUpload?: (id: string) => void;
  onRemoveAttachment?: (attachment: WeeklyLogAttachment) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const canAdd = Boolean(onAddFiles);
  const isEmpty = attachments.length === 0 && pendingFiles.length === 0;

  const handleDownload = async (attachment: WeeklyLogAttachment) => {
    const url = await getAttachmentDownloadUrl(supabase, attachment.file_path);
    if (!url) {
      toast.error("파일 다운로드 링크를 만드는 중 오류가 발생했습니다.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">첨부파일</span>
        {canAdd && (
          <span className="text-xs text-muted-foreground">
            파일당 최대 {formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)}
          </span>
        )}
      </div>

      {canAdd && (
        <div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            multiple
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              if (event.target.files && event.target.files.length > 0) {
                onAddFiles?.(event.target.files);
              }
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip />
            파일 선택
          </Button>
        </div>
      )}

      {!isEmpty && (
        <ul className="flex flex-col gap-2 rounded-md border p-3">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between gap-2 text-sm">
              <button
                type="button"
                onClick={() => void handleDownload(attachment)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left hover:underline"
              >
                <Download className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{attachment.file_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </span>
              </button>
              {onRemoveAttachment && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="첨부파일 삭제"
                  disabled={disabled}
                  onClick={() => onRemoveAttachment(attachment)}
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              )}
            </li>
          ))}

          {pendingFiles.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(item.file.size)}
                </span>
                {item.status === "error" && onRetryUpload && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="다시 시도"
                    onClick={() => onRetryUpload(item.id)}
                  >
                    <RefreshCw className="text-muted-foreground" />
                  </Button>
                )}
                {item.status !== "uploading" && onRemovePendingFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="선택 취소"
                    onClick={() => onRemovePendingFile(item.id)}
                  >
                    <X className="text-muted-foreground" />
                  </Button>
                )}
              </div>
              {item.status === "uploading" && <Progress value={item.progress} className="h-1.5" />}
              {item.status === "error" && (
                <p className="text-xs text-destructive">{item.error ?? "업로드에 실패했습니다."}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
