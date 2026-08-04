"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import {
  WeeklyLogForm,
} from "@/components/weekly-log-form";
import { formatDate } from "@/lib/format";
import type { WeeklyLogDetail } from "@/lib/types";
import type { WeeklyLogFormData } from "@/lib/schemas/weekly-log";
import {
  deleteWeeklyLogAction,
  toggleWeeklyLogCompletionAction,
  updateWeeklyLogAction,
} from "@/lib/actions/weekly-log";

export function WeeklyLogDetailView({
  log,
  canWrite,
}: {
  log: WeeklyLogDetail;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(log.is_completed);
  const [isTogglingCompletion, setIsTogglingCompletion] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // isDeleting 리렌더 반영 전에 도착하는 연속 클릭(더블클릭)을 막기 위한 동기 가드.
  const isDeletingRef = useRef(false);

  const handleEditSubmit = async (values: WeeklyLogFormData) => {
    let result;
    try {
      result = await updateWeeklyLogAction(log.id, values);
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      return;
    }
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("수정되었습니다.");
    setIsEditing(false);
    router.refresh();
  };

  const handleCompletionChange = async (checked: boolean) => {
    const previous = isCompleted;
    setIsCompleted(checked);
    setIsTogglingCompletion(true);
    try {
      const result = await toggleWeeklyLogCompletionAction(log.id, checked);
      if (!result.success) {
        setIsCompleted(previous);
        toast.error(result.error);
        return;
      }
      toast.success(checked ? "완료 처리되었습니다." : "미완료로 변경되었습니다.");
      router.refresh();
    } catch {
      setIsCompleted(previous);
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsTogglingCompletion(false);
    }
  };

  const handleDelete = async () => {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    setIsDeleting(true);
    try {
      const result = await deleteWeeklyLogAction(log.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("삭제되었습니다.");
      router.push("/protected/weekly-logs");
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  };

  const backLink = (
    <Link
      href="/protected/weekly-logs"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline w-fit"
    >
      <ArrowLeft className="size-4" />
      목록으로
    </Link>
  );

  if (isEditing) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <WeeklyLogForm
          defaultValues={{
            title: log.title,
            content: log.content,
            start_date: log.start_date,
            target_end_date: log.target_end_date,
          }}
          submitLabel="수정 완료"
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold">{log.title}</h1>
        <StatusBadge isCompleted={isCompleted} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{log.department_name}</span>
        {log.author_email && <span>{log.author_email}</span>}
        <span>
          {formatDate(log.start_date)} ~ {formatDate(log.target_end_date)}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{log.content}</p>
      {canWrite && (
        <>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_completed"
              checked={isCompleted}
              disabled={isTogglingCompletion}
              onCheckedChange={(checked) => handleCompletionChange(checked === true)}
            />
            <Label htmlFor="is_completed">완료 처리</Label>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={isDeleting}>
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>주간업무일지를 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    삭제한 항목은 복구할 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="button" onClick={() => setIsEditing(true)}>
              수정
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
