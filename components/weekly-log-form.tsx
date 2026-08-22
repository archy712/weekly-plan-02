"use client";

import { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import { CalendarDays, Gauge, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { HtmlEditor } from "@/components/html-editor";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { WeeklyLogAttachmentField } from "@/components/weekly-log-attachment-field";
import type { PendingAttachment } from "@/hooks/use-weekly-log-attachments";
import {
  DEFAULT_IMPORTANCE,
  formatImportanceLabel,
  IMPORTANCE_LEVELS,
  IMPORTANCE_MAX,
  IMPORTANCE_MIN,
} from "@/lib/constants/importance";
import {
  DEFAULT_PROGRESS,
  PROGRESS_MAX,
  PROGRESS_MIN,
  PROGRESS_STEP,
} from "@/lib/constants/progress";
import { weeklyLogSchema, type WeeklyLogFormData } from "@/lib/schemas/weekly-log";
import type { WeeklyLogAttachment, WorkTypeOption } from "@/lib/types";
import { formatThousandsInput } from "@/lib/utils";

// 필드가 길게 나열돼 경계가 안 보인다는 피드백에 따라(F053) "기본 정보/업무 내용/추가 정보"
// 3개 구간으로 나누는 라벨 붙은 구분선. 장식용이라 Separator 자체는 decorative(기본값)로 두고
// 별도 role/aria는 추가하지 않는다 — 텍스트 라벨이 이미 스크린 리더로 읽힌다.
function FormSectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs font-semibold tracking-wide text-muted-foreground">
        {label}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

export function WeeklyLogForm({
  defaultValues,
  workTypeOptions,
  submitLabel = "저장",
  onSubmit,
  onCancel,
  attachments,
  pendingFiles,
  onAddFiles,
  onRemovePendingFile,
  onRetryUpload,
  onRemoveAttachment,
  onFormReady,
}: {
  defaultValues?: Partial<WeeklyLogFormData>;
  workTypeOptions: WorkTypeOption[];
  submitLabel?: string;
  onSubmit: (values: WeeklyLogFormData) => Promise<void> | void;
  onCancel: () => void;
  attachments: WeeklyLogAttachment[];
  pendingFiles: PendingAttachment[];
  onAddFiles: (files: FileList) => void;
  onRemovePendingFile: (id: string) => void;
  onRetryUpload: (id: string) => void;
  onRemoveAttachment: (attachment: WeeklyLogAttachment) => void;
  // F042 임시저장(Task 041) 전용 훅 — 신규 작성 폼이 이 react-hook-form 인스턴스를 받아
  // watch() 자동 저장 구독을 걸 때만 쓴다. 수정 폼(weekly-log-detail-view.tsx)은 넘기지
  // 않으므로 그 경로에는 아무 영향이 없다.
  onFormReady?: (form: UseFormReturn<WeeklyLogFormData>) => void;
}) {
  const form = useForm<WeeklyLogFormData>({
    resolver: zodResolver(weeklyLogSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      work_type: defaultValues?.work_type ?? [],
      importance: defaultValues?.importance ?? DEFAULT_IMPORTANCE,
      progress: defaultValues?.progress ?? DEFAULT_PROGRESS,
      content: defaultValues?.content ?? "",
      start_date: defaultValues?.start_date ?? "",
      target_end_date: defaultValues?.target_end_date ?? "",
      estimated_mm: defaultValues?.estimated_mm ?? "",
      estimated_cost: defaultValues?.estimated_cost ?? "",
      partner_company: defaultValues?.partner_company ?? "",
    },
  });

  // useForm()이 반환하는 객체는 컴포넌트 생명주기 동안 안정적인 참조이므로, 마운트 시
  // 1회만 부모에 전달하면 된다(부모가 이 폼이 remount될 때마다 새로 받고 싶다면 key prop으로
  // WeeklyLogForm 자체를 remount시키면 된다 — components/weekly-log-new-form.tsx의 복원
  // 흐름 참고).
  useEffect(() => {
    onFormReady?.(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSubmitting = form.formState.isSubmitting;

  // isSubmitting은 리렌더 이후에야 반영되므로, 리렌더 전에 도착하는 연속 클릭(더블클릭 등)은
  // disabled 속성만으로 막히지 않는다. ref는 동기적으로 갱신되므로 즉시 재진입을 차단한다.
  const isSubmittingRef = useRef(false);
  const handleFormSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    if (isSubmittingRef.current) {
      event.preventDefault();
      return;
    }
    isSubmittingRef.current = true;
    // 검증 실패로 onSubmit이 호출되지 않는 경우까지 포함해 항상 가드를 해제한다.
    void form.handleSubmit(onSubmit)(event).finally(() => {
      isSubmittingRef.current = false;
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
        <FormSectionDivider label="기본 정보" />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
                  시작일
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="target_end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
                  목표종료일
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* work_type은 다중 선택(체크박스)이라 shadcn의 표준 "체크박스 배열" 패턴을 쓴다:
            바깥 FormField는 라벨/에러 메시지 표시 용도이고, 항목별 FormField가 실제 배열
            값(field.value)에 포함 여부를 확인해 추가/제거한다. */}
        <FormField
          control={form.control}
          name="work_type"
          render={() => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-muted-foreground" aria-hidden />
                업무 타입
              </FormLabel>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {workTypeOptions.map(({ name: type, archived }) => (
                  <FormField
                    key={type}
                    control={form.control}
                    name="work_type"
                    render={({ field }) => {
                      const checked = field.value?.includes(type) ?? false;
                      return (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                const current = field.value ?? [];
                                field.onChange(
                                  isChecked
                                    ? [...current, type]
                                    : current.filter((value) => value !== type),
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {archived ? `${type} (비활성)` : type}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="importance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                업무 중요도{" "}
                <span className="text-muted-foreground font-normal">
                  {formatImportanceLabel(field.value as (typeof IMPORTANCE_LEVELS)[number])}
                </span>
              </FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2 pt-1">
                  <Slider
                    min={IMPORTANCE_MIN}
                    max={IMPORTANCE_MAX}
                    step={1}
                    value={[field.value]}
                    onValueChange={([next]) => field.onChange(next)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {IMPORTANCE_LEVELS.map((level) => (
                      <span key={level}>{formatImportanceLabel(level)}</span>
                    ))}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* 목표진척률(시작일~목표종료일 대비 오늘 위치)과 비교할 실제 진척률 — 자동으로
            산출할 방법이 마땅치 않아 슬라이더로 직접 입력받는다. 상세 페이지의 "빠른 편집"
            인라인 슬라이더와 값 범위·단위가 항상 같아야 한다(lib/constants/progress.ts). */}
        <FormField
          control={form.control}
          name="progress"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Gauge className="size-3.5 text-muted-foreground" aria-hidden />
                진척률{" "}
                <span className="text-muted-foreground font-normal">{field.value}%</span>
              </FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2 pt-1">
                  <Slider
                    min={PROGRESS_MIN}
                    max={PROGRESS_MAX}
                    step={PROGRESS_STEP}
                    value={[field.value]}
                    onValueChange={([next]) => field.onChange(next)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormSectionDivider label="업무 내용" />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>업무명</FormLabel>
              <FormControl>
                <Input maxLength={100} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>업무 상세 내용 (주요 키워드 중심으로 작성해 주세요)</FormLabel>
              <FormControl>
                <HtmlEditor {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormSectionDivider label="추가 정보" />
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="estimated_mm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>예상 소요 M/M</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="예: 1.5"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estimated_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>예상 소요 금액(단위:원)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="예: 5,000,000"
                    {...field}
                    onChange={(e) => field.onChange(formatThousandsInput(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="partner_company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>관련 협력 회사</FormLabel>
                <FormControl>
                  <Input maxLength={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <WeeklyLogAttachmentField
          attachments={attachments}
          pendingFiles={pendingFiles}
          onAddFiles={onAddFiles}
          onRemovePendingFile={onRemovePendingFile}
          onRetryUpload={onRetryUpload}
          onRemoveAttachment={onRemoveAttachment}
          disabled={isSubmitting}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "저장 중..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
