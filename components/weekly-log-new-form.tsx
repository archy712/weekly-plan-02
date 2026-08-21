"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";

import { WeeklyLogDraftBanner } from "@/components/weekly-log-draft-banner";
import { WeeklyLogForm } from "@/components/weekly-log-form";
import { useWeeklyLogAttachments } from "@/hooks/use-weekly-log-attachments";
import { useWeeklyLogDraft } from "@/hooks/use-weekly-log-draft";
import { createWeeklyLogAction } from "@/lib/actions/weekly-log";
import type { WeeklyLogFormData } from "@/lib/schemas/weekly-log";
import type { WorkTypeOption } from "@/lib/types";

export function WeeklyLogNewForm({
  workTypeOptions,
  userId,
}: {
  workTypeOptions: WorkTypeOption[];
  userId: string;
}) {
  const router = useRouter();
  const attachmentsState = useWeeklyLogAttachments();
  // 첨부파일 업로드 실패로 재제출될 때 weekly_logs 행이 중복 생성되지 않도록,
  // 최초 저장 성공 시의 id/department_id를 보관해두고 이후 제출부터는 재사용한다.
  const createdRef = useRef<{ id: string; departmentId: string } | null>(null);

  // F042 임시저장(Task 041).
  const draft = useWeeklyLogDraft(userId);
  const formRef = useRef<UseFormReturn<WeeklyLogFormData> | null>(null);
  // [복원] 클릭 시 WeeklyLogForm을 새 defaultValues로 다시 마운트한다. Tiptap 에디터
  // (components/html-editor.tsx)는 생성 시점의 content만 초기값으로 쓰고 이후 value prop
  // 변화를 구독하지 않으므로(외부 setContent 동기화 없음), form.reset()만으로는 본문
  // 내용이 반영되지 않는다 — 나머지 9개 필드는 RHF가 defaultValues를 그대로 반영하므로
  // 함께 재마운트해도 값이 정확히 일치한다.
  const [restoredValues, setRestoredValues] = useState<WeeklyLogFormData | undefined>(undefined);
  const [formInstanceKey, setFormInstanceKey] = useState(0);

  const handleFormReady = useCallback((form: UseFormReturn<WeeklyLogFormData>) => {
    formRef.current = form;
  }, []);

  // formInstanceKey가 바뀔 때마다(최초 마운트 포함) WeeklyLogForm이 remount되어 새
  // react-hook-form 인스턴스를 만든다 — 그 인스턴스에 자동 저장 구독을 다시 건다.
  // handleFormReady(자식의 effect)는 React가 같은 커밋에서 부모보다 먼저 실행하므로,
  // 이 효과가 실행될 시점엔 formRef.current가 이미 새 인스턴스로 채워져 있다.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    return draft.watchForm(form);
    // draft.watchForm은 draft의 내부 key(userId)에만 의존해 렌더마다 재구독할 필요가
    // 없다 — formInstanceKey가 바뀔 때(remount로 새 form이 생겼을 때)만 다시 건다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formInstanceKey]);

  const handleRestore = useCallback(() => {
    const values = draft.restore();
    if (values) {
      setRestoredValues(values);
      setFormInstanceKey((key) => key + 1);
    }
  }, [draft]);

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
      // 저장에 성공한 순간 draft는 더 이상 필요 없다 — 이후 첨부파일 업로드가 실패해
      // 재제출되더라도(createdRef 가드로 행은 재생성되지 않는다) 이미 저장된 행이 있으므로
      // draft를 남겨두면 재진입 시 혼란만 준다.
      draft.discard();
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
    // 작성 후에는 상세가 아니라 목록으로 돌아간다. createWeeklyLogAction이 이미
    // revalidatePath로 목록을 무효화하지만, 라우터 클라이언트 캐시가 이전 목록을
    // 재사용하지 않도록 refresh를 함께 호출해 새로 만든 업무가 즉시 보이게 한다.
    router.push("/protected/weekly-logs");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {draft.hasDraft && (
        <WeeklyLogDraftBanner
          savedAt={draft.savedAt}
          onRestore={handleRestore}
          onDiscard={draft.discard}
        />
      )}
      <WeeklyLogForm
        key={formInstanceKey}
        defaultValues={restoredValues}
        onFormReady={handleFormReady}
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
    </div>
  );
}
