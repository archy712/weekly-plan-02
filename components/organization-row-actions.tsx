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
import { OrganizationFormDialog } from "@/components/organization-form-dialog";
import {
  archiveOrganizationAction,
  deleteOrganizationAction,
  restoreOrganizationAction,
} from "@/lib/actions/organization";

export function OrganizationRowActions({
  organization,
  departmentCount,
}: {
  organization: { id: string; name: string; archived_at: string | null };
  departmentCount: number;
}) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isArchived = Boolean(organization.archived_at);
  const hasReferences = departmentCount > 0;

  const handleToggleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = isArchived
        ? await restoreOrganizationAction(organization.id)
        : await archiveOrganizationAction(organization.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isArchived ? "조직이 활성화되었습니다." : "조직이 비활성화되었습니다.");
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
      const result = await deleteOrganizationAction(organization.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("조직이 삭제되었습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <OrganizationFormDialog
        mode="edit"
        organization={{ id: organization.id, name: organization.name }}
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
            <AlertDialogTitle>{organization.name} 조직을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 소속 부서가 없는 경우에만 삭제할 수 있습니다.
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
