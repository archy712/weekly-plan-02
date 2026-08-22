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
import { AssignDirectHeadDialog } from "@/components/assign-direct-head-dialog";
import { DivisionFormDialog } from "@/components/division-form-dialog";
import {
  archiveDivisionAction,
  deleteDivisionAction,
  restoreDivisionAction,
} from "@/lib/actions/division";
import type { HeadCandidate, Organization } from "@/lib/types";

export function DivisionRowActions({
  division,
  organizations,
  headCandidates,
  departmentCount,
}: {
  division: {
    id: string;
    name: string;
    archived_at: string | null;
    organization_id: string;
    head_profile_id: string | null;
  };
  organizations: Organization[];
  headCandidates: HeadCandidate[];
  departmentCount: number;
}) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isArchived = Boolean(division.archived_at);
  const hasReferences = departmentCount > 0;

  const handleToggleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = isArchived
        ? await restoreDivisionAction(division.id)
        : await archiveDivisionAction(division.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isArchived ? "부서가 활성화되었습니다." : "부서가 비활성화되었습니다.");
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
      const result = await deleteDivisionAction(division.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("부서가 삭제되었습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <DivisionFormDialog
        mode="edit"
        division={{
          id: division.id,
          name: division.name,
          organization_id: division.organization_id,
          head_profile_id: division.head_profile_id,
        }}
        headCandidates={headCandidates}
        organizations={organizations}
        trigger={
          <Button variant="ghost" size="sm">
            수정
          </Button>
        }
      />
      <Button variant="ghost" size="sm" onClick={handleToggleArchive} disabled={isArchiving}>
        {isArchiving ? "처리 중..." : isArchived ? "활성화" : "비활성화"}
      </Button>
      <AssignDirectHeadDialog
        scope={{
          kind: "division",
          id: division.id,
          name: division.name,
          organizationId: division.organization_id,
        }}
        trigger={
          <Button variant="ghost" size="sm">
            부서장으로 지정
          </Button>
        }
      />
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
            <AlertDialogTitle>{division.name} 부서를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 소속된 팀이 없는 경우에만 삭제할 수 있습니다.
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
