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

// 라벨(제목) 열 너비(px)와 날짜 1칸의 최소 너비(px) — 날짜 수만큼 그리드 열이 늘어나므로
// 인라인 style로 gridTemplateColumns를 계산한다(Tailwind는 동적 열 개수를 표현할 수 없다).
// 날짜 열은 DAY_MIN_WIDTH를 최솟값으로 하는 minmax(..., 1fr)라 컨테이너가 넓으면(예: 넓은
// 화면에서 한 달 범위) 남는 폭을 균등하게 나눠 가져 스크롤 없이 꽉 채우고, 컨테이너가
// 이 최솟값의 합보다 좁을 때만(기간이 길거나 화면이 좁을 때) overflow-x-auto로 스크롤된다.
const LABEL_WIDTH = 200;
const DAY_MIN_WIDTH = 28;
const ROW_HEIGHT = 48;

// 범례(막대 색상 3종 + 지연 테두리 + 오늘 세로선)에서도 재사용하는 상태 라벨 순서.
const STATUS_LEGEND_ORDER: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

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
    // 동일한 제목의 업무가 여러 부서/작성자에게서 반복될 수 있어(정기 업무 명칭 관례),
    // 막대·행 라벨만으로는 서로 구분이 안 된다는 피드백에 따라 작성자 식별자를 함께 쓴다
    // (list/kanban 카드와 동일한 author_name → author_email → 폴백 우선순위, weekly-log-card.tsx 등 참고).
    const authorLabel = item.author_name ?? item.author_email ?? "알 수 없는 사용자";
    const dateRangeText = `${formatDate(item.start_date)} ~ ${formatDate(item.target_end_date)}`;
    return { item, startOffset, spanDays, overdue, clippedStart, clippedEnd, authorLabel, dateRangeText };
  });

  const gridTemplateColumns = `${LABEL_WIDTH}px repeat(${totalDays}, minmax(${DAY_MIN_WIDTH}px, 1fr))`;

  return (
    <div className="flex flex-col gap-4">
      <LoadingBar active={isPending} />
      <WeeklyLogViewSwitcher current="timeline" filters={rawFilters} />
      {/* 필터 컨트롤 전체를 카드 하나로 감싸 아래 타임라인과 시각적으로 분리한다 —
          배경 없이 여백만으로 구분되던 이전 레이아웃은 "필터 영역이 어디까지인지"
          스캔하기 어렵다는 피드백에 따른 개선. */}
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
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
              <SelectItem value={ALL_STATUSES_FILTER}>전체 상태</SelectItem>
              {STATUS_FILTER_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>
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
          <>
            {/* 페이지 본문 자체는 가로 스크롤되지 않고, 이 컨테이너 내부만 스크롤된다(칸반
                컬럼 반응형 수정에서 겪은 문제와 동일한 원칙 — overflow는 항상 안쪽 컨테이너가
                책임진다). */}
            <div className="overflow-x-auto rounded-lg border">
              <div
                className="relative w-full"
                style={{ minWidth: `${LABEL_WIDTH + totalDays * DAY_MIN_WIDTH}px` }}
              >
                {/* 범례(막대 색상 3종·지연 테두리(+아이콘)·오늘 세로선·진척률이 무엇을
                    뜻하는지 화면 어디에도 설명이 없다는 피드백에 따라 추가)와 날짜 헤더를
                    "하나의" sticky 블록으로 묶는다 — 이 프로젝트에서 position: sticky를 쓰는
                    첫 지점. 처음엔 범례(top-0)와 날짜 헤더(top-8, 범례 높이만큼 내림)를
                    따로 sticky 처리했는데, 두 요소가 독립적으로 고정되다 보니 스크롤 중
                    경계에서 아주 살짝 어긋나(브라우저 서브픽셀 반올림 등) 그 틈으로 바로 위
                    행이 비쳐 보이는 버그가 실제로 있었다 — 범례와 헤더를 한 wrapper 안에
                    넣고 wrapper 하나에만 sticky top-0을 걸면 둘 사이에 애초에 "이가 맞아야
                    하는 경계"가 없어져 이 문제가 구조적으로 발생할 수 없다.
                    범례는 이 wrapper가 가로 스크롤 컨테이너 안에 있어 그대로 두면 오른쪽으로
                    스크롤할 때 함께 밀려나므로, sticky left-0을 추가로 걸어 왼쪽 끝에도
                    고정한다. bg-background로 완전 불투명하게 둬야 스크롤되는 아래 내용이
                    비쳐 보이지 않는다. */}
                <div className="bg-background sticky top-0 z-20">
                  <div className="sticky left-0 flex h-8 w-fit shrink-0 items-center gap-x-4 px-2 text-xs text-muted-foreground">
                    {STATUS_LEGEND_ORDER.map((status) => (
                      <span key={status} className="flex items-center gap-1.5">
                        <span
                          className="inline-block size-3 rounded-sm"
                          style={{ backgroundColor: STATUS_CHART_COLORS[status] }}
                          aria-hidden
                        />
                        {getStatusLabel(status)}
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5">
                      <span
                        className="bg-muted relative inline-flex size-3 items-center justify-center rounded-sm border-2 border-destructive"
                        aria-hidden
                      >
                        <AlertTriangle className="size-2 text-destructive" aria-hidden />
                      </span>
                      지연
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="relative inline-flex size-3 overflow-hidden rounded-sm"
                        style={{ backgroundColor: STATUS_CHART_COLORS.in_progress }}
                        aria-hidden
                      >
                        <span className="absolute inset-y-0 left-0 w-1/2 bg-black/25" />
                      </span>
                      진척률(입력 시 진하게)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="bg-primary inline-block h-3 w-0.5" aria-hidden />
                      오늘
                    </span>
                  </div>
                  <div
                    className="grid border-b bg-muted text-xs text-muted-foreground"
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
                </div>
                {bars.map(
                  ({
                    item,
                    startOffset,
                    spanDays,
                    overdue,
                    clippedStart,
                    clippedEnd,
                    authorLabel,
                    dateRangeText,
                  }) => {
                    // 진척률이 입력된(0%에서 바뀐) 업무만 노출한다 — 0%는 "아직 입력 안 함"과
                    // 구분할 수 없어(weekly-log-detail-view.tsx와 동일한 관례) 그냥 숨긴다.
                    const progressText = item.progress > 0 ? ` · 진척률 ${item.progress}%` : "";
                    // 마우스오버 시 상태·기간·지연 여부·부서·작성자·진척률을 한 번에 보여주는
                    // 네이티브 title 툴팁 — 이 페이지의 다른 요소(아래 Link의 title 등)와
                    // 동일하게 별도 Tooltip 라이브러리 없이 브라우저 기본 툴팁을 재사용한다.
                    const tooltip = `${item.title}\n${item.department_name} · ${authorLabel}\n${dateRangeText} · ${getStatusLabel(item.status)}${overdue ? " · 지연" : ""}${progressText}`;
                    return (
                      <div
                        key={item.id}
                        className="grid items-center border-b last:border-b-0"
                        style={{ gridTemplateColumns, height: ROW_HEIGHT }}
                      >
                        {/* 동일한 제목의 업무가 여러 부서/작성자에게서 반복될 수 있어(정기
                            업무 명칭 관례), 제목 아래 작성자를 보조 텍스트로 함께 표시해
                            구분할 수 있게 한다. */}
                        <Link
                          href={`/protected/weekly-logs/${item.id}`}
                          className="flex min-w-0 flex-col justify-center gap-0.5 px-2 hover:text-primary"
                          title={tooltip}
                        >
                          <span className="truncate text-sm hover:underline">{item.title}</span>
                          <span className="text-muted-foreground truncate text-xs">
                            {authorLabel}
                          </span>
                        </Link>
                        <div
                          className="relative h-full"
                          style={{ gridColumn: `2 / span ${totalDays}` }}
                        >
                          <div
                            role="img"
                            aria-label={`${item.title}, 부서: ${item.department_name}, 작성자: ${authorLabel}, ${dateRangeText}, ${getStatusLabel(item.status)}${overdue ? ", 지연" : ""}${progressText}`}
                            title={tooltip}
                            className={cn(
                              "absolute inset-y-2 flex items-center overflow-hidden rounded",
                              clippedStart && "rounded-l-none",
                              clippedEnd && "rounded-r-none",
                              // 지연은 빨간 테두리 하나에만 의존하면 예정(주황)과 색상이
                              // 가까워 헷갈린다는 피드백에 따라 아이콘을 함께 병행한다.
                              overdue && "ring-2 ring-destructive",
                            )}
                            style={{
                              // 날짜 열이 minmax(..., 1fr)라 실제 렌더 폭이 화면마다 달라지므로,
                              // 고정 px 대신 이 wrapper(정확히 totalDays개 열의 폭 = 100%) 기준
                              // 백분율로 위치·너비를 계산해야 열 경계와 항상 정확히 일치한다.
                              left: `${(startOffset / totalDays) * 100}%`,
                              width: `${(spanDays / totalDays) * 100}%`,
                              backgroundColor: STATUS_CHART_COLORS[item.status],
                            }}
                          >
                            {/* 간트 차트의 흔한 관례 — 막대 안에 진척률만큼 더 어둡게 채워
                                "기간 대비 실제 완료분"을 한눈에 보이게 한다. 0%(미입력)는
                                표시하지 않는다. */}
                            {item.progress > 0 && (
                              <div
                                className="absolute inset-y-0 left-0 bg-black/25"
                                style={{ width: `${item.progress}%` }}
                                aria-hidden
                              />
                            )}
                            {overdue && (
                              <AlertTriangle
                                className="relative z-10 ml-0.5 size-3 shrink-0 text-white drop-shadow-sm"
                                aria-hidden
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
                {showTodayLine && (
                  <div
                    className="pointer-events-none absolute inset-y-0 border-l-2 border-primary"
                    // 날짜 영역(라벨 열을 제외한 나머지 100% - LABEL_WIDTH)의 todayOffset/totalDays
                    // 지점 — 위 막대와 동일한 이유로 고정 px 대신 calc 기반 백분율을 쓴다.
                    style={{
                      left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${todayOffset / totalDays})`,
                    }}
                    aria-hidden
                  />
                )}
              </div>
            </div>
          </>
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
                  <th scope="col">부서</th>
                  <th scope="col">작성자</th>
                  <th scope="col">시작일</th>
                  <th scope="col">목표종료일</th>
                  <th scope="col">진행상태</th>
                  <th scope="col">지연 여부</th>
                  <th scope="col">진척률</th>
                </tr>
              </thead>
              <tbody>
                {bars.map(({ item, overdue, authorLabel }) => (
                  <tr key={item.id}>
                    <th scope="row">{item.title}</th>
                    <td>{item.department_name}</td>
                    <td>{authorLabel}</td>
                    <td>{formatDate(item.start_date)}</td>
                    <td>{formatDate(item.target_end_date)}</td>
                    <td>{getStatusLabel(item.status)}</td>
                    <td>{overdue ? "지연" : "정상"}</td>
                    <td>{item.progress > 0 ? `${item.progress}%` : "미입력"}</td>
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
