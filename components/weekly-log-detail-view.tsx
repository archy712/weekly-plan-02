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
import { HtmlContent } from "@/components/html-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { StatusBadge } from "@/components/status-badge";
import {
  WeeklyLogForm,
} from "@/components/weekly-log-form";
import { WeeklyLogAttachmentField } from "@/components/weekly-log-attachment-field";
import { WeeklyLogCommentSection } from "@/components/weekly-log-comment-section";
import { useWeeklyLogAttachments } from "@/hooks/use-weekly-log-attachments";
import {
  formatImportanceLabel,
  IMPORTANCE_LEVELS,
  IMPORTANCE_MAX,
  IMPORTANCE_MIN,
} from "@/lib/constants/importance";
import { WORK_TYPE_OPTIONS } from "@/lib/constants/work-types";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/format";
import { formatThousandsInput } from "@/lib/utils";
import type {
  WeeklyLogDetail,
  WeeklyLogImportance,
  WeeklyLogStatus,
  WeeklyLogWorkType,
} from "@/lib/types";
import type { WeeklyLogFormData } from "@/lib/schemas/weekly-log";
import {
  deleteWeeklyLogAction,
  updateWeeklyLogStatusAction,
  updateWeeklyLogWorkTypeAction,
  updateWeeklyLogImportanceAction,
  updateWeeklyLogAction,
} from "@/lib/actions/weekly-log";

const STATUS_OPTIONS: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

export function WeeklyLogDetailView({
  log,
  canWrite,
  currentUserId,
  isAdmin,
}: {
  log: WeeklyLogDetail;
  canWrite: boolean;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<WeeklyLogStatus>(log.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [workType, setWorkType] = useState<WeeklyLogWorkType[]>(log.work_type);
  const [isUpdatingWorkType, setIsUpdatingWorkType] = useState(false);
  const [importance, setImportance] = useState<WeeklyLogImportance>(log.importance);
  const [isUpdatingImportance, setIsUpdatingImportance] = useState(false);
  // 슬라이더 드래그 중에는 화면에만 반영하고(onValueChange), 손을 뗄 때만 서버에 저장한다
  // (onValueCommit). 저장 실패 시 롤백할 "마지막으로 저장된 값"을 별도로 추적해야 한다 —
  // importance state 자체는 드래그 중 계속 바뀌므로 실패 시점의 "이전 값"으로 쓸 수 없다.
  const savedImportanceRef = useRef<WeeklyLogImportance>(log.importance);
  const [isDeleting, setIsDeleting] = useState(false);
  // isDeleting 리렌더 반영 전에 도착하는 연속 클릭(더블클릭)을 막기 위한 동기 가드.
  const isDeletingRef = useRef(false);
  const attachmentsState = useWeeklyLogAttachments(log.attachments);

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

    if (attachmentsState.hasPendingUploads) {
      const { failedCount } = await attachmentsState.uploadAll(log.id, log.department_id);
      if (failedCount > 0) {
        toast.error(`수정되었지만 첨부파일 ${failedCount}개 업로드에 실패했습니다. 다시 시도해주세요.`);
        return;
      }
    }

    toast.success("수정되었습니다.");
    setIsEditing(false);
    router.refresh();
  };

  const handleStatusChange = async (next: WeeklyLogStatus) => {
    const previous = status;
    if (next === previous) return;
    setStatus(next);
    setIsUpdatingStatus(true);
    try {
      const result = await updateWeeklyLogStatusAction(log.id, next);
      if (!result.success) {
        setStatus(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`${getStatusLabel(next)} 상태로 변경되었습니다.`);
      router.refresh();
    } catch {
      setStatus(previous);
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleWorkTypeChange = async (type: WeeklyLogWorkType, checked: boolean) => {
    const previous = workType;
    const next = checked
      ? [...previous, type]
      : previous.filter((value) => value !== type);

    if (next.length === 0) {
      toast.error("업무 타입을 1개 이상 선택해주세요.");
      return;
    }

    setWorkType(next);
    setIsUpdatingWorkType(true);
    try {
      const result = await updateWeeklyLogWorkTypeAction(log.id, next);
      if (!result.success) {
        setWorkType(previous);
        toast.error(result.error);
        return;
      }
      router.refresh();
    } catch {
      setWorkType(previous);
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsUpdatingWorkType(false);
    }
  };

  const handleImportanceCommit = async (next: WeeklyLogImportance) => {
    if (next === savedImportanceRef.current) return;
    setIsUpdatingImportance(true);
    try {
      const result = await updateWeeklyLogImportanceAction(log.id, next);
      if (!result.success) {
        setImportance(savedImportanceRef.current);
        toast.error(result.error);
        return;
      }
      savedImportanceRef.current = next;
      toast.success(`업무 중요도가 '${formatImportanceLabel(next)}'(으)로 변경되었습니다.`);
      router.refresh();
    } catch {
      setImportance(savedImportanceRef.current);
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsUpdatingImportance(false);
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
            work_type: workType,
            importance,
            content: log.content,
            start_date: log.start_date,
            target_end_date: log.target_end_date,
            estimated_mm: log.estimated_mm != null ? String(log.estimated_mm) : "",
            estimated_cost:
              log.estimated_cost != null ? formatThousandsInput(String(log.estimated_cost)) : "",
            partner_company: log.partner_company ?? "",
          }}
          submitLabel="수정 완료"
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditing(false)}
          attachments={attachmentsState.attachments}
          pendingFiles={attachmentsState.pendingFiles}
          onAddFiles={attachmentsState.addFiles}
          onRemovePendingFile={attachmentsState.removePendingFile}
          onRetryUpload={(id) => attachmentsState.retryUpload(id, log.id, log.department_id)}
          onRemoveAttachment={attachmentsState.removeExistingAttachment}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold">{log.title}</h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="secondary">중요도: {formatImportanceLabel(importance)}</Badge>
          <StatusBadge status={status} />
        </div>
      </div>
      {canWrite ? (
        <div className="flex flex-col gap-1.5">
          <Label>업무 타입</Label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {WORK_TYPE_OPTIONS.map((type) => {
              const checked = workType.includes(type);
              return (
                <div key={type} className="flex flex-row items-center gap-2">
                  <Checkbox
                    id={`work-type-${type}`}
                    checked={checked}
                    disabled={isUpdatingWorkType}
                    onCheckedChange={(isChecked) =>
                      handleWorkTypeChange(type, isChecked === true)
                    }
                  />
                  <Label htmlFor={`work-type-${type}`} className="text-sm font-normal">
                    {type}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        workType.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {workType.map((type) => (
              <Badge key={type} variant="outline" className="font-normal text-muted-foreground">
                {type}
              </Badge>
            ))}
          </div>
        )
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{log.department_name}</span>
        {log.author_email && <span>{log.author_email}</span>}
        <span>
          {formatDate(log.start_date)} ~ {formatDate(log.target_end_date)}
        </span>
      </div>
      {(log.estimated_mm != null || log.estimated_cost != null || log.partner_company) && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-3 text-sm">
          {log.estimated_mm != null && (
            <div>
              <span className="text-muted-foreground">예상 소요 M/M</span>{" "}
              <span className="font-medium">{log.estimated_mm} M/M</span>
            </div>
          )}
          {log.estimated_cost != null && (
            <div>
              <span className="text-muted-foreground">예상 소요 금액(단위:원)</span>{" "}
              <span className="font-medium">{formatCurrency(log.estimated_cost)}</span>
            </div>
          )}
          {log.partner_company && (
            <div>
              <span className="text-muted-foreground">관련 협력 회사</span>{" "}
              <span className="font-medium">{log.partner_company}</span>
            </div>
          )}
        </div>
      )}
      <HtmlContent html={log.content} />
      {attachmentsState.attachments.length > 0 && (
        <WeeklyLogAttachmentField attachments={attachmentsState.attachments} pendingFiles={[]} />
      )}
      {canWrite && (
        <>
          <div className="flex items-center gap-2">
            <Label htmlFor="status">진행 상태</Label>
            <Select
              value={status}
              disabled={isUpdatingStatus}
              onValueChange={(value) => handleStatusChange(value as WeeklyLogStatus)}
            >
              <SelectTrigger id="status" className="w-32" aria-label="진행 상태">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {getStatusLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="importance">업무 중요도 {formatImportanceLabel(importance)}</Label>
            <Slider
              id="importance"
              min={IMPORTANCE_MIN}
              max={IMPORTANCE_MAX}
              step={1}
              value={[importance]}
              disabled={isUpdatingImportance}
              onValueChange={([next]) => setImportance(next as WeeklyLogImportance)}
              onValueCommit={([next]) => handleImportanceCommit(next as WeeklyLogImportance)}
              aria-label="업무 중요도"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {IMPORTANCE_LEVELS.map((level) => (
                <span key={level}>{formatImportanceLabel(level)}</span>
              ))}
            </div>
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
      <WeeklyLogCommentSection
        weeklyLogId={log.id}
        comments={log.comments}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
