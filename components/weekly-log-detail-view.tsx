"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
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
// 편집 폼은 Tiptap 에디터(html-editor)를 끌고 오는 무거운 청크라, 대부분 읽기 전용인 상세
// 페이지 초기 번들에서 분리한다 — "수정"을 눌러 isEditing이 될 때만 동적으로 로드한다.
const WeeklyLogForm = dynamic(
  () => import("@/components/weekly-log-form").then((mod) => mod.WeeklyLogForm),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">편집 화면을 불러오는 중…</p>
    ),
  },
);
import { WeeklyLogAttachmentField } from "@/components/weekly-log-attachment-field";
import { WeeklyLogChangeHistorySection } from "@/components/weekly-log-change-history";
import { WeeklyLogCommentSection } from "@/components/weekly-log-comment-section";
import { WeeklyLogReactionButtons } from "@/components/weekly-log-reaction-buttons";
import { useWeeklyLogAttachments } from "@/hooks/use-weekly-log-attachments";
import {
  formatImportanceLabel,
  IMPORTANCE_LEVELS,
  IMPORTANCE_MAX,
  IMPORTANCE_MIN,
} from "@/lib/constants/importance";
import { PROGRESS_MAX, PROGRESS_MIN, PROGRESS_STEP } from "@/lib/constants/progress";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/format";
import { cn, computeTargetProgress, formatThousandsInput } from "@/lib/utils";
import type {
  WeeklyLogDetail,
  WeeklyLogImportance,
  WeeklyLogStatus,
  WeeklyLogWorkType,
  WorkTypeOption,
} from "@/lib/types";
import type { WeeklyLogFormData } from "@/lib/schemas/weekly-log";
import {
  deleteWeeklyLogAction,
  updateWeeklyLogStatusAction,
  updateWeeklyLogWorkTypeAction,
  updateWeeklyLogImportanceAction,
  updateWeeklyLogProgressAction,
  updateWeeklyLogAction,
} from "@/lib/actions/weekly-log";

const STATUS_OPTIONS: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

export function WeeklyLogDetailView({
  log,
  canWrite,
  currentUserId,
  isAdmin,
  workTypeOptions,
  todayIso,
}: {
  log: WeeklyLogDetail;
  canWrite: boolean;
  currentUserId: string;
  isAdmin: boolean;
  workTypeOptions: WorkTypeOption[];
  // 목표진척률 계산 기준일 — 칸반·타임라인·"내 업무" 위젯의 지연 판정과 동일하게 호출부
  // (Node의 new Date())에서 계산해 내려받는다(서버 컴포넌트가 매 요청 새로 계산).
  todayIso: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  // 진행상태·업무타입·중요도·진척률 인라인 편집 컨트롤은 기본적으로 숨겨두고, 이 토글을
  // 눌러야만 펼쳐진다 — 내 부서(canWrite) 업무를 열었을 때 곧바로 Select·Slider가
  // 나타나 "수정 화면에 들어온 것 같다"는 혼동이 있어, 다른 부서 업무를 볼 때와 동일하게
  // 항상 읽기 전용 화면으로 먼저 보여준 뒤 명시적으로 편집을 펼치게 한다.
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
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
  const [progress, setProgress] = useState(log.progress);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const savedProgressRef = useRef(log.progress);
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

    // work_type/importance/progress는 title·content 등과 달리 log prop이 아니라 이
    // 컴포넌트의 useState로 관리된다(인라인 즉시 편집과 값을 공유하기 위함) — 전체 수정
    // 폼으로 값을 바꿔도 이 상태들은 자동으로 갱신되지 않아(useState 초기값은 최초 마운트
    // 시에만 반영됨), router.refresh() 이후에도 배지·"빠른 편집" 슬라이더가 예전 값을 계속
    // 보여주는 문제가 있었다. 제출된 값으로 직접 동기화한다.
    setWorkType(values.work_type);
    setImportance(values.importance as WeeklyLogImportance);
    savedImportanceRef.current = values.importance as WeeklyLogImportance;
    setProgress(values.progress);
    savedProgressRef.current = values.progress;

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

  const handleProgressCommit = async (next: number) => {
    if (next === savedProgressRef.current) return;
    setIsUpdatingProgress(true);
    try {
      const result = await updateWeeklyLogProgressAction(log.id, next);
      if (!result.success) {
        setProgress(savedProgressRef.current);
        toast.error(result.error);
        return;
      }
      savedProgressRef.current = next;
      toast.success(`진척률이 ${next}%로 변경되었습니다.`);
      router.refresh();
    } catch {
      setProgress(savedProgressRef.current);
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsUpdatingProgress(false);
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

  const isCompleted = status === "completed";
  // 목표진척률: 시작일~목표종료일 대비 오늘 위치(%, 100 초과分은 클램프). 저장하지 않고
  // 매 렌더링마다 계산한다 — DB에 별도 컬럼을 두지 않는 이유는 lib/utils.ts 참고.
  const targetProgress = computeTargetProgress(log.start_date, log.target_end_date, todayIso);
  // 완료 처리된 업무는 실제 슬라이더 값이 100%에 못 미쳐도(사용자가 마지막으로 저장한
  // 값 그대로 남아있을 수 있음) 진척률 비교 자체를 무시하고 100%로 간주한다 — "완료"인데
  // 진척률 막대가 0%로 보이는 모순을 없애기 위함. DB의 실제 progress 값은 건드리지
  // 않는다(상태를 다시 진행중으로 되돌리면 원래 값이 그대로 남아 있어야 하므로).
  const displayProgress = isCompleted ? 100 : progress;
  // 완료된 업무는 진척률이 목표에 못 미쳐도 "지연"으로 보지 않는다 — 칸반·타임라인의
  // 기존 지연 판정(status !== "completed")과 동일한 원칙.
  const delayed = !isCompleted && progress < targetProgress;

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
          workTypeOptions={workTypeOptions}
          defaultValues={{
            title: log.title,
            work_type: workType,
            importance,
            progress,
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
          {/* 진척률이 목표진척률에 못 미치면(완료 제외) 표시 — canWrite 여부와 무관하게
              모든 열람자에게 노출한다(중요도·진행상태 배지와 동일한 공개 범위). */}
          {delayed && (
            <Badge
              variant="destructive"
              title={`진척률 ${progress}%, 목표진척률 ${targetProgress}%`}
            >
              지연
            </Badge>
          )}
        </div>
      </div>
      {canWrite && (
        // 진행상태·업무타입·중요도·진척률을 즉시 편집할 수 있다는 사실 자체를 이 배너로
        // 명시한다 — 연필 아이콘 + 라벨로 "이 항목들은 편집 가능"임을 표시하고, 실제
        // 편집 컨트롤은 눌러야만 펼쳐지게 해 읽기 전용 화면과 명확히 구분한다.
        <button
          type="button"
          onClick={() => setIsQuickEditOpen((prev) => !prev)}
          className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-left text-sm text-muted-foreground hover:border-primary hover:text-primary"
          aria-expanded={isQuickEditOpen}
        >
          <span className="flex items-center gap-1.5">
            <Pencil className="size-3.5" aria-hidden />
            진행상태·업무타입·중요도·진척률을 바로 수정할 수 있습니다
          </span>
          <span className="font-medium">{isQuickEditOpen ? "편집 접기" : "빠른 편집"}</span>
        </button>
      )}
      {canWrite && isQuickEditOpen ? (
        <div className="flex flex-col gap-1.5">
          <Label>업무 타입</Label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {workTypeOptions.map(({ name: type, archived }) => {
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
                    {archived ? `${type} (비활성)` : type}
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
      {/* 진척률 대 목표진척률 — 열람 권한과 무관하게 항상 노출한다(중요도·진행상태
          배지와 동일한 공개 범위). 목표진척률은 타임라인 뷰의 "오늘" 세로선과 동일한
          시각 언어(세로 마커)로 실제 진척률 막대 위에 겹쳐 그려 한눈에 비교할 수 있게
          한다 — 숫자 두 개를 각각 읽고 암산으로 비교하게 하는 것보다 직관적이다.
          완료 처리된 업무는 목표 대비 비교 자체가 의미 없으므로(displayProgress가
          항상 100) 마커 없이 꽉 찬 막대만 보여준다. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">진척률</span>
          <span className="text-muted-foreground">
            {isCompleted ? (
              "진척률 100% (완료)"
            ) : (
              <>
                진척률 {progress}% · 목표진척률 {targetProgress}%
              </>
            )}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              delayed ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${displayProgress}%` }}
          />
          {!isCompleted && (
            <div
              className="bg-foreground/70 absolute inset-y-0 w-0.5"
              style={{ left: `${targetProgress}%` }}
              title={`목표진척률 ${targetProgress}%`}
              aria-hidden
            />
          )}
        </div>
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
      {/* 추천/비추천은 부서·쓰기권한과 무관하게 모든 로그인 사용자에게 노출한다(F031). */}
      <WeeklyLogReactionButtons weeklyLogId={log.id} initialSummary={log.reactions} />
      {canWrite && isQuickEditOpen && (
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
          {/* 진척률 계산 방법이 마땅치 않아(자동 산출 대신) 사용자가 직접 슬라이더로
              입력한다 — 업무 중요도 슬라이더와 동일한 드래그 중 로컬 반영 + 손을 뗄 때만
              저장(onValueCommit) 패턴. 완료 처리된 업무는 진척률 계산 자체를 무시하고
              완료로 간주하므로(위 displayProgress) 슬라이더를 감추고 안내만 남긴다 —
              진행중으로 되돌리면 마지막으로 저장했던 값 그대로 슬라이더가 다시 보인다. */}
          {isCompleted ? (
            <p className="text-sm text-muted-foreground">
              완료 처리된 업무는 진척률을 100%로 간주합니다. 진척률을 다시 조정하려면
              진행 상태를 먼저 되돌려주세요.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="progress">진척률 {progress}%</Label>
              <Slider
                id="progress"
                min={PROGRESS_MIN}
                max={PROGRESS_MAX}
                step={PROGRESS_STEP}
                value={[progress]}
                disabled={isUpdatingProgress}
                onValueChange={([next]) => setProgress(next)}
                onValueCommit={([next]) => handleProgressCommit(next)}
                aria-label="진척률"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </>
      )}
      {/* 삭제·(제목/본문 등 전체) 수정 버튼은 빠른 편집 토글과 무관하게 항상 노출한다 —
          이 둘은 이미 명확한 버튼이라 인라인 필드(Select·Slider)처럼 "수정 화면에 들어온
          것 같다"는 혼동을 주지 않는다. */}
      {canWrite && (
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
      )}
      <WeeklyLogChangeHistorySection history={log.history} />
      <WeeklyLogCommentSection
        weeklyLogId={log.id}
        comments={log.comments}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
