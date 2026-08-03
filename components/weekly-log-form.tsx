"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type WeeklyLogFormValues = {
  title: string;
  content: string;
  start_date: string;
  target_end_date: string;
};

export function WeeklyLogForm({
  defaultValues,
  submitLabel = "저장",
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<WeeklyLogFormValues>;
  submitLabel?: string;
  onSubmit: (values: WeeklyLogFormValues) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [content, setContent] = useState(defaultValues?.content ?? "");
  const [startDate, setStartDate] = useState(defaultValues?.start_date ?? "");
  const [targetEndDate, setTargetEndDate] = useState(
    defaultValues?.target_end_date ?? "",
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      title,
      content,
      start_date: startDate,
      target_end_date: targetEndDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="start_date">시작일</Label>
          <Input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="target_end_date">목표종료일</Label>
          <Input
            id="target_end_date"
            type="date"
            value={targetEndDate}
            onChange={(event) => setTargetEndDate(event.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={100}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="content">본문</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={5000}
          rows={10}
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
