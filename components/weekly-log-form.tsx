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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { weeklyLogSchema, type WeeklyLogFormData } from "@/lib/schemas/weekly-log";

export function WeeklyLogForm({
  defaultValues,
  submitLabel = "저장",
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<WeeklyLogFormData>;
  submitLabel?: string;
  onSubmit: (values: WeeklyLogFormData) => Promise<void> | void;
  onCancel: () => void;
}) {
  const form = useForm<WeeklyLogFormData>({
    resolver: zodResolver(weeklyLogSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      content: defaultValues?.content ?? "",
      start_date: defaultValues?.start_date ?? "",
      target_end_date: defaultValues?.target_end_date ?? "",
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
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목</FormLabel>
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
              <FormLabel>본문</FormLabel>
              <FormControl>
                <Textarea maxLength={5000} rows={10} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
