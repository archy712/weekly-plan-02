"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { WorkTypeFormDialog } from "@/components/work-type-form-dialog";
import {
  archiveWorkTypeAction,
  deleteWorkTypeAction,
  restoreWorkTypeAction,
} from "@/lib/actions/work-type";
import type { Organization } from "@/lib/types";

export function WorkTypeRowActions({
  workType,
  organizations,
  logCount,
}: {
  workType: { id: string; name: string; archived_at: string | null; organization_id: string };
  organizations: Organization[];
  logCount: number;
}) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isArchived = Boolean(workType.archived_at);
  const hasReferences = logCount > 0;

  const handleToggleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = isArchived
        ? await restoreWorkTypeAction(workType.id)
        : await archiveWorkTypeAction(workType.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isArchived ? "업무 타입이 활성화되었습니다." : "업무 타입이 비활성화되었습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteWorkTypeAction(workType.id, workType.name);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("업무 타입이 삭제되었습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <WorkTypeFormDialog
        mode="edit"
        workType={{
          id: workType.id,
          name: workType.name,
          organization_id: workType.organization_id,
        }}
        organizations={organizations}
        trigger={
          <Button variant="ghost" size="sm">
            수정
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleArchive}
        disabled={isArchiving}
      >
        {isArchiving ? "처리 중..." : isArchived ? "활성화" : "비활성화"}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={hasReferences}
          >
            삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{workType.name} 업무 타입을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 업무일지에서 사용 중이 아닌 경우에만 삭제할 수
              있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
