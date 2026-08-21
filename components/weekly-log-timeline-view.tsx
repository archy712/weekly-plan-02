"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeeklyLogViewSwitcher } from "@/components/weekly-log-view-switcher";
import { EmptyState } from "@/components/empty-state";
import { DateRangeFilter } from "@/components/date-range-filter";
import { LoadingBar } from "@/components/loading-bar";
import { STATUS_CHART_COLORS } from "@/lib/constants/chart-colors";
import { addDaysToDateString, cn, diffDays } from "@/lib/utils";
import { formatDate, getStatusLabel } from "@/lib/format";
import {
  ALL_DEPARTMENTS_FILTER,
  ALL_STATUSES_FILTER,
  WEEKLY_LOGS_TIMELINE_PAGE_SIZE,
} from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  StatusFilter,
  WeeklyLogListItem,
  WeeklyLogStatus,
} from "@/lib/types";

const STATUS_FILTER_OPTIONS: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

// 라벨(제목) 열 너비와 날짜 1칸 너비(px) — 날짜 수만큼 그리드 열이 늘어나므로 인라인
// style로 gridTemplateColumns를 계산한다(Tailwind는 동적 열 개수를 표현할 수 없다).
const LABEL_WIDTH = 200;
const DAY_WIDTH = 28;
const ROW_HEIGHT = 40;

export function WeeklyLogTimelineView({
  items,
  truncated,
  departments,
  currentDepartmentId,
  currentDepartmentName,
  currentSearchQuery,
  currentStatus,
  currentFrom,
  currentTo,
  currentAuthorId,
  todayIso,
}: {
  items: WeeklyLogListItem[];
  // 렌더 상한(WEEKLY_LOGS_TIMELINE_PAGE_SIZE) 초과로 일부가 잘렸는지 여부 — page.tsx가
  // fetchWeeklyLogsTimeline의 hasMore를 그대로 전달한다.
  truncated: boolean;
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentDepartmentName?: string | null;
  currentSearchQuery?: string;
  currentStatus: StatusFilter;
  // 목록·칸반과 달리 기간이 항상 필수다(page.tsx가 URL에 없으면 이번 달로 기본 설정) —
  // 타임라인은 한 화면에 기간 전체를 그리는 구조라 기간 없이는 렌더링 자체가 불가능하다.
  currentFrom: string;
  currentTo: string;
  currentAuthorId?: string;
  todayIso: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearchQuery ?? "");

  const navigate = (overrides: {
    department?: string;
    q?: string;
    status?: string;
    from?: string | null;
    to?: string | null;
    author?: string | null;
  }) => {
    const params = new URLSearchParams();
    params.set("department", overrides.department ?? currentDepartmentId);
    params.set("status", overrides.status ?? currentStatus);
    const q = (overrides.q ?? currentSearchQuery ?? "").trim();
    if (q) params.set("q", q);
    // from/to를 명시적으로 null로 넘기면(초기화 버튼) 파라미터를 아예 제거한다 — 이때도
    // "기간 없음"이 되지는 않는다. page.tsx가 URL에 from/to가 없으면 이번 달로 다시
    // 기본 설정하므로, 목록·칸반과 동일한 navigate 패턴을 그대로 재사용해도 안전하다.
    const from = overrides.from === null ? "" : (overrides.from ?? currentFrom);
    const to = overrides.to === null ? "" : (overrides.to ?? currentTo);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const author = overrides.author === null ? "" : (overrides.author ?? currentAuthorId ?? "");
    if (author) params.set("author", author);
    startTransition(() => {
      router.push(`/protected/weekly-logs/timeline?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ q: searchInput });
  };

  const rawFilters = {
    department: currentDepartmentId,
    status: currentStatus,
    q: currentSearchQuery ?? "",
    from: currentFrom,
    to: currentTo,
    author: currentAuthorId ?? null,
  };

  const scopeLabel = currentDepartmentName ?? "전체 부서";

  type ActiveFilterBadge = { key: string; label: string; onRemove: () => void };
  const activeFilters: ActiveFilterBadge[] = [];
  if (currentDepartmentId !== ALL_DEPARTMENTS_FILTER) {
    activeFilters.push({
      key: "department",
      label: `부서: ${scopeLabel}`,
      onRemove: () => navigate({ department: ALL_DEPARTMENTS_FILTER }),
    });
  }
  if (currentStatus !== ALL_STATUSES_FILTER) {
    activeFilters.push({
      key: "status",
      label: `진행상태: ${getStatusLabel(currentStatus)}`,
      onRemove: () => navigate({ status: ALL_STATUSES_FILTER }),
    });
  }
  if (currentSearchQuery) {
    activeFilters.push({
      key: "q",
      label: `검색어: ${currentSearchQuery}`,
      onRemove: () => {
        setSearchInput("");
        navigate({ q: "" });
      },
    });
  }
  if (currentAuthorId) {
    activeFilters.push({
      key: "author",
      label: "작성자: 나",
      onRemove: () => navigate({ author: null }),
    });
  }

  // 기간은 항상 값이 있어(활성 필터 배지 목록이 아니라) 날짜 축 위에 상시 표시한다.
  const dateRangeLabel = `${formatDate(currentFrom)} ~ ${formatDate(currentTo)}`;

  const totalDays = Math.max(1, diffDays(currentTo, currentFrom) + 1);
  const todayOffset = diffDays(todayIso, currentFrom);
  const showTodayLine = todayOffset >= 0 && todayOffset < totalDays;

  // 조회 기간을 벗어나 걸치는 업무는 누락하지 않고 잘린 막대로 표시한다(v1 Task 029의
  // "기간이 겹치는 항목" 원칙과 동일 — applyScalarFilters가 이미 겹치는 항목만 조회했으므로
  // 여기서는 화면 밖으로 나가는 구간만 잘라내면 된다).
  const bars = items.map((item) => {
    const clippedStart = item.start_date < currentFrom;
    const clippedEnd = item.target_end_date > currentTo;
    const clampedStart = clippedStart ? currentFrom : item.start_date;
    const clampedEnd = clippedEnd ? currentTo : item.target_end_date;
    const startOffset = Math.max(0, diffDays(clampedStart, currentFrom));
    const endOffset = Math.min(totalDays - 1, diffDays(clampedEnd, currentFrom));
    const spanDays = Math.max(1, endOffset - startOffset + 1);
    // 칸반보드(components/weekly-log-kanban-column.tsx)·"내 업무" 위젯과 문자 그대로
    // 동일한 지연 규칙을 쓴다 — 세 화면의 지연 판정이 어긋나면 안 된다.
    const overdue = item.status !== "completed" && item.target_end_date < todayIso;
    return { item, startOffset, spanDays, overdue, clippedStart, clippedEnd };
  });

  const gridTemplateColumns = `${LABEL_WIDTH}px repeat(${totalDays}, ${DAY_WIDTH}px)`;

  return (
    <div className="flex flex-col gap-4">
      <LoadingBar active={isPending} />
      <WeeklyLogViewSwitcher current="timeline" filters={rawFilters} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="제목 또는 내용으로 검색"
              aria-label="주간업무일지 검색"
              className="w-56"
            />
            <Button type="submit" variant="outline" size="icon" aria-label="검색">
              <Search className="size-4" />
            </Button>
          </form>
          <Select
            value={currentDepartmentId}
            onValueChange={(value) => navigate({ department: value })}
          >
            <SelectTrigger className="w-48" aria-label="부서 필터">
              <SelectValue placeholder="부서 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENTS_FILTER}>전체 부서</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.archived_at ? `${dept.name} (비활성)` : dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={currentStatus} onValueChange={(value) => navigate({ status: value })}>
            <SelectTrigger className="w-36" aria-label="진행상태 필터">
              <SelectValue placeholder="진행상태 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES_FILTER}>전체</SelectItem>
              {STATUS_FILTER_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter
          from={currentFrom}
          to={currentTo}
          onFromChange={(value) => navigate({ from: value || null })}
          onToChange={(value) => navigate({ to: value || null })}
          onReset={() => navigate({ from: null, to: null })}
          onPreset={(range) => navigate({ from: range.from, to: range.to })}
        />
        <p className="text-muted-foreground ml-auto text-sm">
          {dateRangeLabel} ·{" "}
          <span className="text-foreground font-medium">{items.length.toLocaleString()}</span>건
        </p>
      </div>
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">적용된 필터:</span>
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1 pr-1">
              {filter.label}
              <button
                type="button"
                onClick={filter.onRemove}
                aria-label={`${filter.label} 필터 해제`}
                className="hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {truncated && (
        <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
          <span>
            표시 상한({WEEKLY_LOGS_TIMELINE_PAGE_SIZE.toLocaleString()}건)을 초과하는 업무가
            있습니다. 기간을 좁히면 나머지 항목을 확인할 수 있습니다.
          </span>
        </div>
      )}
      <div
        className={cn(
          "flex flex-col gap-4 transition-opacity",
          isPending && "pointer-events-none opacity-60",
        )}
        aria-busy={isPending}
      >
        {items.length === 0 ? (
          <EmptyState
            title="표시할 업무가 없습니다"
            description="기간이나 필터를 조정해보세요."
          />
        ) : (
          // 페이지 본문 자체는 가로 스크롤되지 않고, 이 컨테이너 내부만 스크롤된다(칸반
          // 컬럼 반응형 수정에서 겪은 문제와 동일한 원칙 — overflow는 항상 안쪽 컨테이너가
          // 책임진다).
          <div className="overflow-x-auto rounded-lg border">
            <div
              className="relative"
              style={{ width: `${LABEL_WIDTH + totalDays * DAY_WIDTH}px` }}
            >
              <div
                className="grid border-b bg-muted/30 text-xs text-muted-foreground"
                style={{ gridTemplateColumns }}
              >
                <div className="px-2 py-1.5 font-medium text-foreground">업무</div>
                {Array.from({ length: totalDays }).map((_, index) => {
                  const dateStr = addDaysToDateString(currentFrom, index);
                  const day = Number(dateStr.slice(8, 10));
                  const isMonthStart = day === 1;
                  return (
                    <div
                      key={dateStr}
                      className="flex items-center justify-center border-l py-1.5 tabular-nums"
                      aria-hidden
                    >
                      {isMonthStart ? formatDate(dateStr).slice(5) : day}
                    </div>
                  );
                })}
              </div>
              {bars.map(({ item, startOffset, spanDays, overdue, clippedStart, clippedEnd }) => (
                <div
                  key={item.id}
                  className="grid items-center border-b last:border-b-0"
                  style={{ gridTemplateColumns, height: ROW_HEIGHT }}
                >
                  <Link
                    href={`/protected/weekly-logs/${item.id}`}
                    className="truncate px-2 text-sm hover:text-primary hover:underline"
                    title={item.title}
                  >
                    {item.title}
                  </Link>
                  <div
                    className="relative h-full"
                    style={{ gridColumn: `2 / span ${totalDays}` }}
                  >
                    <div
                      role="img"
                      aria-label={`${item.title}, ${formatDate(item.start_date)} ~ ${formatDate(item.target_end_date)}, ${getStatusLabel(item.status)}${overdue ? ", 지연" : ""}`}
                      className={cn(
                        "absolute inset-y-2 rounded",
                        clippedStart && "rounded-l-none",
                        clippedEnd && "rounded-r-none",
                        overdue && "ring-2 ring-destructive",
                      )}
                      style={{
                        left: `${startOffset * DAY_WIDTH}px`,
                        width: `${spanDays * DAY_WIDTH}px`,
                        backgroundColor: STATUS_CHART_COLORS[item.status],
                      }}
                    />
                  </div>
                </div>
              ))}
              {showTodayLine && (
                <div
                  className="pointer-events-none absolute inset-y-0 border-l-2 border-primary"
                  style={{ left: `${LABEL_WIDTH + todayOffset * DAY_WIDTH}px` }}
                  aria-hidden
                />
              )}
            </div>
          </div>
        )}
        {/* 시각적 막대만으로는 정보가 전달되지 않으므로, 동일한 데이터를 표로 제공한다
            (v1 Task 031이 대시보드 차트에 적용한 것과 동일한 해법). sr-only는 <table>에
            직접 주면 안 된다 — table-layout:auto에서는 width:1px가 컨텐츠보다 우선하지
            못해 실제 렌더 박스가 컨텐츠 크기(수백px)로 확장되고, clip-path로 시각적으로만
            숨겨질 뿐 문서의 가로 스크롤 폭에는 그대로 반영돼(390px 뷰포트에서 실측
            확인) 모바일에서 페이지 본문이 가로로 스크롤되는 회귀가 생긴다. div는 이
            table 전용 확장 규칙이 없어 width:1px+overflow:hidden이 그대로 적용되므로,
            sr-only를 감싸는 div에 걸고 table 자체에는 스타일을 주지 않는다. */}
        {items.length > 0 && (
          <div className="sr-only">
            <table>
              <caption>기간 내 주간업무일지 목록(막대 그래프의 대체 텍스트)</caption>
              <thead>
                <tr>
                  <th scope="col">제목</th>
                  <th scope="col">시작일</th>
                  <th scope="col">목표종료일</th>
                  <th scope="col">진행상태</th>
                  <th scope="col">지연 여부</th>
                </tr>
              </thead>
              <tbody>
                {bars.map(({ item, overdue }) => (
                  <tr key={item.id}>
                    <th scope="row">{item.title}</th>
                    <td>{formatDate(item.start_date)}</td>
                    <td>{formatDate(item.target_end_date)}</td>
                    <td>{getStatusLabel(item.status)}</td>
                    <td>{overdue ? "지연" : "정상"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
