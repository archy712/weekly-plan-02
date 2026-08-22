"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProfileSearchPicker, type ProfileSearchResult } from "@/components/profile-search-picker";
import { assignOrganizationDirectHeadAction } from "@/lib/actions/organization";
import { assignDivisionDirectHeadAction } from "@/lib/actions/division";

type Scope =
  | { kind: "organization"; id: string; name: string }
  | { kind: "division"; id: string; name: string; organizationId: string };

// 특정 팀에 속하지 않고 부문/부서 전체를 총괄하는 장(長)을 지정하는 다이얼로그 — 예전엔
// "직속 팀 만들기" 버튼으로 더미 팀만 만들고, 사용자 관리에서 실제 팀 목록 중 그 더미 팀을
// 찾아 소속을 옮긴 뒤, 다시 이 화면으로 돌아와 장을 지정해야 했다(3단계, 실제 업무팀과
// 더미 팀이 같은 목록에 섞여 있어 부자연스럽다는 사용자 피드백). 이 다이얼로그는 이름 검색
// 하나로 대상을 고르면 "직속 팀 확보 → 소속 이동 → 장 지정"을 서버 액션 하나로 묶어 처리한다
// (lib/actions/organization.ts의 assignOrganizationDirectHeadAction, lib/actions/division.ts의
// assignDivisionDirectHeadAction). 후보는 팀 소속 여부로 미리 좁히지 않고 검색으로 아무
// 프로필이나 고를 수 있게 하되(ProfileSearchPicker가 search_mentionable_profiles RPC로
// 시스템 전체를 검색), 조직 범위 밖이거나 아직 팀이 없는 대상은 서버 액션이 최종 거부한다.
export function AssignDirectHeadDialog({ scope, trigger }: { scope: Scope; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ProfileSearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const roleLabel = scope.kind === "organization" ? "부문장" : "부서장";

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSelected(null);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const result =
        scope.kind === "organization"
          ? await assignOrganizationDirectHeadAction(scope.id, selected.id)
          : await assignDivisionDirectHeadAction(scope.id, scope.organizationId, selected.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${selected.name ?? selected.email}님을 ${roleLabel}으로 지정했습니다.`);
      handleOpenChange(false);
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{roleLabel}으로 지정</DialogTitle>
          <DialogDescription>
            선택한 인원의 소속 팀을 &quot;{scope.name} 직속&quot; 팀으로 옮기고 {roleLabel}으로
            지정합니다. 이 팀이 없으면 자동으로 만들어집니다. 아직 팀을 선택하지 않은 사용자는
            먼저 프로필에서 팀을 선택해야 지정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <ProfileSearchPicker value={selected} onChange={setSelected} disabled={isSubmitting} />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!selected || isSubmitting}>
            {isSubmitting ? "지정 중..." : "지정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
