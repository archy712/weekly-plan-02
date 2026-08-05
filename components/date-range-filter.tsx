"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRecentMonthsRange, getThisMonthRange, getThisWeekRange } from "@/lib/utils";

// Task 029(`weekly-log-list-view.tsx`)에서 처음 만든 기간 입력 + 프리셋 버튼 UI를
// Task 031(대시보드)에서도 그대로 재사용할 수 있도록 추출한 컴포넌트. 값 관리(URL
// 동기화 방식 등)는 호출자에게 맡기고, 이 컴포넌트는 순수하게 값과 콜백만 받는다.
export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onReset,
  onPreset,
}: {
  from?: string;
  to?: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onReset: () => void;
  onPreset: (range: { from: string; to: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={from ?? ""}
        onChange={(e) => onFromChange(e.target.value)}
        aria-label="시작일 이후"
        max={to}
        className="w-40"
      />
      <span className="text-muted-foreground text-sm">~</span>
      <Input
        type="date"
        value={to ?? ""}
        onChange={(e) => onToChange(e.target.value)}
        aria-label="종료일 이전"
        min={from}
        className="w-40"
      />
      {(from || to) && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          초기화
        </Button>
      )}
      <div className="flex items-center gap-1 border-l pl-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPreset(getThisWeekRange())}
        >
          이번 주
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPreset(getThisMonthRange())}
        >
          이번 달
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPreset(getRecentMonthsRange(3))}
        >
          최근 3개월
        </Button>
      </div>
    </div>
  );
}
