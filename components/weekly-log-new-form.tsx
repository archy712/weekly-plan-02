"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { WeeklyLogForm } from "@/components/weekly-log-form";
import { useWeeklyLogAttachments } from "@/hooks/use-weekly-log-attachments";
import { createWeeklyLogAction } from "@/lib/actions/weekly-log";
import type { WeeklyLogFormData } from "@/lib/schemas/weekly-log";
import type { WorkTypeOption } from "@/lib/types";

export function WeeklyLogNewForm({ workTypeOptions }: { workTypeOptions: WorkTypeOption[] }) {
  const router = useRouter();
  const attachmentsState = useWeeklyLogAttachments();
  // 첨부파일 업로드 실패로 재제출될 때 weekly_logs 행이 중복 생성되지 않도록,
  // 최초 저장 성공 시의 id/department_id를 보관해두고 이후 제출부터는 재사용한다.
  const createdRef = useRef<{ id: string; departmentId: string } | null>(null);

  const handleSubmit = async (values: WeeklyLogFormData) => {
    let created = createdRef.current;

    if (!created) {
      let result;
      try {
        result = await createWeeklyLogAction(values);
      } catch {
        toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
        return;
      }
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      created = { id: result.id, departmentId: result.departmentId };
      createdRef.current = created;
    }

    if (attachmentsState.hasPendingUploads) {
      const { failedCount } = await attachmentsState.uploadAll(created.id, created.departmentId);
      if (failedCount > 0) {
        toast.error(
          `주간업무일지는 저장되었지만 첨부파일 ${failedCount}개 업로드에 실패했습니다. 다시 시도해주세요.`,
        );
        return;
      }
    }

    toast.success("주간업무일지가 저장되었습니다.");
    router.push(`/protected/weekly-logs/${created.id}`);
  };

  return (
    <WeeklyLogForm
      workTypeOptions={workTypeOptions}
      submitLabel="저장"
      onCancel={() => router.push("/protected/weekly-logs")}
      onSubmit={handleSubmit}
      attachments={attachmentsState.attachments}
      pendingFiles={attachmentsState.pendingFiles}
      onAddFiles={attachmentsState.addFiles}
      onRemovePendingFile={attachmentsState.removePendingFile}
      onRetryUpload={(id) => {
        const created = createdRef.current;
        if (created) attachmentsState.retryUpload(id, created.id, created.departmentId);
      }}
      onRemoveAttachment={attachmentsState.removeExistingAttachment}
    />
  );
}
