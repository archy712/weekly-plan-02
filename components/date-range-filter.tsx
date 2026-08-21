"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getRecentMonthsRange, getThisMonthRange, getThisWeekRange } from "@/lib/utils";

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
  // 현재 from/to가 프리셋 버튼이 만드는 범위와 정확히 일치하면 그 버튼을 active로
  // 표시한다 — 버튼을 다시 눌러도 되는지, 지금 값이 어느 프리셋에서 왔는지 한눈에
  // 보이지 않는다는 사용성 피드백에 따른 개선.
  const isPresetActive = (range: { from: string; to: string }) =>
    from === range.from && to === range.to;

  const presets: { label: string; range: { from: string; to: string } }[] = [
    { label: "이번 주", range: getThisWeekRange() },
    { label: "이번 달", range: getThisMonthRange() },
    { label: "최근 3개월", range: getRecentMonthsRange(3) },
  ];

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
        {presets.map(({ label, range }) => {
          const active = isPresetActive(range);
          return (
            <Button
              key={label}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              aria-pressed={active}
              className={cn(active && "pointer-events-none")}
              onClick={() => onPreset(range)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
