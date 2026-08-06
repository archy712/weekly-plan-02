"use client";

import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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
import { WORK_TYPE_OPTIONS } from "@/lib/constants/work-types";
import { weeklyLogSchema, type WeeklyLogFormData } from "@/lib/schemas/weekly-log";
import type { WeeklyLogAttachment } from "@/lib/types";
import { formatThousandsInput } from "@/lib/utils";

export function WeeklyLogForm({
  defaultValues,
  submitLabel = "저장",
  onSubmit,
  onCancel,
  attachments,
  pendingFiles,
  onAddFiles,
  onRemovePendingFile,
  onRetryUpload,
  onRemoveAttachment,
}: {
  defaultValues?: Partial<WeeklyLogFormData>;
  submitLabel?: string;
  onSubmit: (values: WeeklyLogFormData) => Promise<void> | void;
  onCancel: () => void;
  attachments: WeeklyLogAttachment[];
  pendingFiles: PendingAttachment[];
  onAddFiles: (files: FileList) => void;
  onRemovePendingFile: (id: string) => void;
  onRetryUpload: (id: string) => void;
  onRemoveAttachment: (attachment: WeeklyLogAttachment) => void;
}) {
  const form = useForm<WeeklyLogFormData>({
    resolver: zodResolver(weeklyLogSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      work_type: defaultValues?.work_type ?? [],
      importance: defaultValues?.importance ?? DEFAULT_IMPORTANCE,
      content: defaultValues?.content ?? "",
      start_date: defaultValues?.start_date ?? "",
      target_end_date: defaultValues?.target_end_date ?? "",
      estimated_mm: defaultValues?.estimated_mm ?? "",
      estimated_cost: defaultValues?.estimated_cost ?? "",
      partner_company: defaultValues?.partner_company ?? "",
    },
  });

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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>시작일</FormLabel>
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
                <FormLabel>목표종료일</FormLabel>
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
              <FormLabel>업무 타입</FormLabel>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {WORK_TYPE_OPTIONS.map((type) => (
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
                          <FormLabel className="text-sm font-normal">{type}</FormLabel>
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
