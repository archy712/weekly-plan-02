"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";

// F042 임시저장(Task 041) 복원 배너. 자동 복원 금지 — 사용자가 [복원]을 눌러야만 값이
// 반영된다(무엇이 복원됐는지 인지하지 못한 채 화면이 바뀌는 것을 방지).
export function WeeklyLogDraftBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: Date | null;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">
            임시 저장된 내용이 있습니다
            {savedAt ? ` (${formatRelativeTime(savedAt.toISOString())} 저장됨)` : ""}
          </p>
          <p className="text-muted-foreground">첨부파일은 복원되지 않습니다.</p>
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDiscard}>
            삭제
          </Button>
          <Button type="button" size="sm" onClick={onRestore}>
            복원
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
