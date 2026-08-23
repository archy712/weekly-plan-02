"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  // 빈 date input 2개만 나란히 있으면 어느 쪽이 시작/종료인지 알아볼 수 없다는 피드백에 따라
  // aria-label(스크린리더 전용)만이 아니라 화면에 보이는 라벨을 각 입력 위에 둔다. 컴포넌트가
  // 한 페이지에 여러 번 렌더링될 일은 없지만(목록/칸반/타임라인/대시보드가 각자 자기 페이지에서
  // 한 번씩만 사용) htmlFor 충돌을 피하기 위해 useId로 고유 id를 생성한다.
  const fromId = useId();
  const toId = useId();

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor={fromId} className="text-muted-foreground text-xs font-normal">
          시작일
        </Label>
        <Input
          id={fromId}
          type="date"
          value={from ?? ""}
          onChange={(e) => onFromChange(e.target.value)}
          max={to}
          className="w-full sm:w-40"
        />
      </div>
      <span className="text-muted-foreground pb-2 text-sm">~</span>
      <div className="flex flex-col gap-1">
        <Label htmlFor={toId} className="text-muted-foreground text-xs font-normal">
          종료일
        </Label>
        <Input
          id={toId}
          type="date"
          value={to ?? ""}
          onChange={(e) => onToChange(e.target.value)}
          min={from}
          className="w-full sm:w-40"
        />
      </div>
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
