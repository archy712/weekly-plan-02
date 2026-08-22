"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { OrganizationFormDialog } from "@/components/organization-form-dialog";
import { archiveOrganizationAction, restoreOrganizationAction } from "@/lib/actions/organization";
import type { HeadCandidate } from "@/lib/types";

export function OrganizationRowActions({
  organization,
  headCandidates,
}: {
  organization: {
    id: string;
    name: string;
    archived_at: string | null;
    head_profile_id: string | null;
  };
  headCandidates: HeadCandidate[];
}) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const isArchived = Boolean(organization.archived_at);

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
      toast.success(isArchived ? "부문이 활성화되었습니다." : "부문이 비활성화되었습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <OrganizationFormDialog
        organization={{
          id: organization.id,
          name: organization.name,
          head_profile_id: organization.head_profile_id,
        }}
        headCandidates={headCandidates}
        trigger={
          <Button variant="outline" size="sm">
            수정
          </Button>
        }
      />
      <Button variant="outline" size="sm" onClick={handleToggleArchive} disabled={isArchiving}>
        {isArchiving ? "처리 중..." : isArchived ? "활성화" : "비활성화"}
      </Button>
    </div>
  );
}
