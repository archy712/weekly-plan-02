"use client";

import { useState } from "react";
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
  type WeeklyLogFormValues,
} from "@/components/weekly-log-form";
import { formatDate } from "@/lib/format";
import type { WeeklyLogDetail } from "@/lib/types";
import {
  setCompletionOverride,
  useCompletionOverride,
} from "@/lib/dummy-log-overrides";

export function WeeklyLogDetailView({ log }: { log: WeeklyLogDetail }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<WeeklyLogFormValues>({
    title: log.title,
    content: log.content,
    start_date: log.start_date,
    target_end_date: log.target_end_date,
  });
  const isCompleted = useCompletionOverride(log.id, log.is_completed);

  const handleSubmit = (next: WeeklyLogFormValues) => {
    setValues(next);
    setIsEditing(false);
  };

  const handleCompletionChange = (checked: boolean) => {
    setCompletionOverride(log.id, checked);
    toast.success(checked ? "완료 처리되었습니다." : "미완료로 변경되었습니다.");
  };

  const handleDelete = () => {
    router.push("/protected/weekly-logs");
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
          defaultValues={values}
          submitLabel="수정 완료"
          onSubmit={handleSubmit}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold">{values.title}</h1>
        <StatusBadge isCompleted={isCompleted} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{log.department_name}</span>
        {log.author_email && <span>{log.author_email}</span>}
        <span>
          {formatDate(values.start_date)} ~ {formatDate(values.target_end_date)}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {values.content}
      </p>
      <div className="flex items-center gap-2">
        <Checkbox
          id="is_completed"
          checked={isCompleted}
          onCheckedChange={(checked) => handleCompletionChange(checked === true)}
        />
        <Label htmlFor="is_completed">완료 처리</Label>
      </div>
      <div className="flex justify-end gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive">
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
              <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button type="button" onClick={() => setIsEditing(true)}>
          수정
        </Button>
      </div>
    </div>
  );
}
