"use client";

import { useId } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateRangeFilterHint } from "@/lib/format";
import { cn, getRecentMonthsRange, getThisMonthRange, getThisWeekRange } from "@/lib/utils";

// Task 029(`weekly-log-list-view.tsx`)에서 처음 만든 기간 입력 + 프리셋 버튼 UI를
// Task 031(대시보드)에서도 그대로 재사용할 수 있도록 추출한 컴포넌트. 값 관리(URL
// 동기화 방식 등)는 호출자에게 맡기고, 이 컴포넌트는 순수하게 값과 콜백만 받는다.
//
// **이 필터는 업무의 "시작일 범위 / 목표종료일 범위"가 아니라 조회 기간(window)이다.**
// 업무 기간([시작일, 목표종료일])이 이 창과 하루라도 겹치면 포함된다
// (`start_date <= 기간종료 AND target_end_date >= 기간시작`, 구현은
// lib/queries/weekly-logs.ts의 applyScalarFilters와 stats_* RPC가 공유).
// 그래서 두 입력칸은 이름과 비교 대상이 교차한다 — "기간 시작"은 업무의 목표종료일과,
// "기간 종료"는 업무의 시작일과 비교된다. 라벨이 업무 속성명("시작일"/"목표종료일")과
// 똑같아 이 교차를 오해하기 쉽다는 피드백에 따라, (1) 라벨을 "기간 시작/기간 종료"로,
// (2) 그룹 제목을 PDF·Excel 헤더와 같은 "조회 기간"으로 맞추고, (3) 현재 입력이 실제로
// 무엇을 남기는지 아래 한 줄로 항상 설명하며, (4) 규칙과 예시는 ⓘ 팝오버에 둔다.
const OVERLAP_RULE_EXAMPLE =
  "예) 8월 3일~8월 31일 업무는 조회 기간을 8월 20일~8월 25일로 좁혀도 그대로 나옵니다. 시작일만 비교하면 이런 장기 업무가 누락되기 때문입니다.";

export function DateRangeFilter({
  from,
  to,
  isDefault,
  onFromChange,
  onToChange,
  onReset,
  onPreset,
}: {
  from?: string;
  to?: string;
  // 값이 사용자가 고른 것이 아니라 최초 진입 기본값으로 채워졌을 때만 true(목록·칸반).
  // 기본값이 걸려 있다는 사실을 라벨로 알려 주지 않으면 "왜 일부 업무가 안 보이지?"가 되고,
  // 반대로 값만 보이면 사용자가 직접 넣은 조건으로 오해한다.
  isDefault?: boolean;
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

  const hint = formatDateRangeFilterHint(from, to);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-xs font-medium">조회 기간</span>
        {isDefault && (from || to) && (
          <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[11px]">
            기본값
          </span>
        )}
        {/* 툴팁이 아니라 팝오버인 이유: 이 설명은 터치 기기에서도 읽을 수 있어야 하고
            (Radix Tooltip은 hover/포커스 전용) 문장이 길어 탭으로 열고 닫는 편이 낫다. */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-5"
              aria-label="조회 기간 필터 설명 보기"
            >
              <Info className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 text-sm">
            <p className="font-medium">업무 기간이 겹치면 포함됩니다</p>
            <p className="text-muted-foreground mt-1.5">
              업무의 <strong className="text-foreground">시작일 ~ 목표종료일</strong>이 아래에
              지정한 조회 기간과 하루라도 겹치면 목록에 남습니다. 업무의 시작일이 조회 기간 안에
              있어야 하는 것은 아닙니다.
            </p>
            <p className="text-muted-foreground mt-1.5">{OVERLAP_RULE_EXAMPLE}</p>
            <p className="text-muted-foreground mt-1.5">
              한쪽만 입력할 수도 있습니다 — <strong className="text-foreground">기간 시작</strong>
              만 지정하면 그 날 이후까지 진행되는 업무(= 아직 끝나지 않은 업무),
              <strong className="text-foreground"> 기간 종료</strong>만 지정하면 그 날까지 시작한
              업무가 남습니다.
            </p>
            {isDefault && (from || to) && (
              <p className="text-muted-foreground mt-1.5">
                지금은 <strong className="text-foreground">첫 진입 기본값</strong>이 적용돼
                있습니다(과거에 끝난 업무를 감추기 위한 조건). [초기화]를 누르면 전체 기간으로
                풀립니다.
              </p>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={fromId} className="text-muted-foreground text-xs font-normal">
            기간 시작
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
            기간 종료
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
      {/* 입력이 없으면(전체 기간) 설명할 것이 없어 줄 자체를 만들지 않는다. */}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}
