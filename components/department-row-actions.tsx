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
import { DepartmentFormDialog } from "@/components/department-form-dialog";
import {
  archiveDepartmentAction,
  deleteDepartmentAction,
  restoreDepartmentAction,
} from "@/lib/actions/department";
import type { Division, HeadCandidate, Organization } from "@/lib/types";

export function DepartmentRowActions({
  department,
  organizations,
  divisions,
  headCandidates,
  memberCount,
  logCount,
}: {
  department: {
    id: string;
    name: string;
    archived_at: string | null;
    organization_id: string;
    division_id: string | null;
    head_profile_id: string | null;
  };
  organizations: Organization[];
  divisions: Division[];
  headCandidates: HeadCandidate[];
  memberCount: number;
  logCount: number;
}) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isArchived = Boolean(department.archived_at);
  const hasReferences = memberCount > 0 || logCount > 0;

  const handleToggleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = isArchived
        ? await restoreDepartmentAction(department.id)
        : await archiveDepartmentAction(department.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isArchived ? "팀이 활성화되었습니다." : "팀이 비활성화되었습니다.");
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
      const result = await deleteDepartmentAction(department.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("팀이 삭제되었습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <DepartmentFormDialog
        mode="edit"
        department={{
          id: department.id,
          name: department.name,
          organization_id: department.organization_id,
          division_id: department.division_id,
          head_profile_id: department.head_profile_id,
        }}
        headCandidates={headCandidates}
        organizations={organizations}
        divisions={divisions}
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
            <AlertDialogTitle>{department.name} 팀을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 팀원과 진행업무가 없는 경우에만 삭제할 수
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
