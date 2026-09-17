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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProfileSearchPicker, type ProfileSearchResult } from "@/components/profile-search-picker";
import { transferWeeklyLogAction } from "@/lib/actions/weekly-log-transfer";

const NOTE_MAX_LENGTH = 200;

// 진행업무 오너십 이관 다이얼로그(F063). 호출부(weekly-log-detail-view.tsx)가 관리자에게만
// 렌더링하지만, 실제 권한 판정은 transfer_weekly_log() RPC와 weekly_logs의 BEFORE UPDATE
// 트리거가 각각 최종적으로 수행한다(UI 게이트는 사전 안내일 뿐).
//
// 대상자 검색은 부문장/부서장 지정(assign-direct-head-dialog.tsx)과 동일하게
// ProfileSearchPicker(search_mentionable_profiles RPC + 200ms debounce)를 재사용한다 —
// 팀 소속과 무관하게 아무나 검색해 고르되, 조직 범위 밖이거나 아직 팀이 없는 대상은
// 서버가 거부하고 그 사유를 한국어 메시지로 그대로 돌려준다.
export function WeeklyLogTransferDialog({
  logId,
  currentOwnerName,
  trigger,
}: {
  logId: string;
  currentOwnerName: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ProfileSearchResult | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSelected(null);
      setNote("");
    }
  };

  const handleSubmit = async () => {
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await transferWeeklyLogAction(logId, selected.id, note);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`담당자를 ${selected.name ?? selected.email}님으로 이관했습니다.`);
      handleOpenChange(false);
      // 이관은 담당자·소속 팀·이력·이관 횟수가 한꺼번에 바뀌어 낙관적 업데이트로 화면을
      // 부분 갱신하기 어렵다(진행상태·중요도 인라인 편집과 다른 점) — 서버에서 새로 받는다.
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
          <DialogTitle>담당자 이관</DialogTitle>
          <DialogDescription>
            현재 담당자는 {currentOwnerName}님입니다. 새 담당자를 선택하면 이 진행업무의 소속
            팀도 새 담당자의 팀으로 함께 옮겨지고, 새 담당자에게 알림이 발송됩니다. 이관은
            여러 번 할 수 있으며 모든 기록이 이관 이력에 남습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {/* ProfileSearchPicker는 내부 Input에 id를 받지 않으므로 htmlFor 대신 시각적 라벨로만 쓴다. */}
            <Label>새 담당자</Label>
            <ProfileSearchPicker
              value={selected}
              onChange={setSelected}
              disabled={isSubmitting}
              placeholder="이름 또는 이메일로 검색"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-note">이관 사유 (선택)</Label>
            <Textarea
              id="transfer-note"
              value={note}
              maxLength={NOTE_MAX_LENGTH}
              disabled={isSubmitting}
              placeholder="예: 담당 조직 변경에 따른 업무 재배정"
              onChange={(event) => setNote(event.target.value)}
              rows={3}
            />
            <p className="text-right text-xs text-muted-foreground">
              {note.length}/{NOTE_MAX_LENGTH}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!selected || isSubmitting}>
            {isSubmitting ? "이관 중..." : "이관"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
