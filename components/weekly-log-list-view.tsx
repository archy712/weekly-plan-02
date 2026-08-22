"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { toast } from "sonner";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WeeklyLogTable } from "@/components/weekly-log-table";
import { WeeklyLogCardList } from "@/components/weekly-log-card";
import { WeeklyLogFilterPresets } from "@/components/weekly-log-filter-presets";
import { WeeklyLogViewSwitcher } from "@/components/weekly-log-view-switcher";
import { EmptyState } from "@/components/empty-state";
import { DateRangeFilter } from "@/components/date-range-filter";
import { LoadingBar } from "@/components/loading-bar";
import { cn } from "@/lib/utils";
import { downloadWeeklyLogListPdf } from "@/lib/pdf/weekly-log-pdf";
import { downloadWeeklyLogListExcel } from "@/lib/excel/weekly-log-excel";
import { createClient } from "@/lib/supabase/client";
import {
  loadAllWeeklyLogsForExportAction,
  loadMoreWeeklyLogsAction,
} from "@/lib/actions/weekly-log-list";
import { formatDate, getStatusLabel } from "@/lib/format";
import type { FilterPresetFilters } from "@/hooks/use-filter-presets";
import { ALL_DEPARTMENTS_FILTER, ALL_STATUSES_FILTER } from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  StatusFilter,
  WeeklyLogExportItem,
  WeeklyLogListItem,
  WeeklyLogSortDirection,
  WeeklyLogSortKey,
  WeeklyLogStatus,
} from "@/lib/types";

const STATUS_FILTER_OPTIONS: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

export function WeeklyLogListView({
  initialItems,
  initialHasMore,
  totalCount,
  departments,
  currentDepartmentId,
  currentDepartmentName,
  currentSearchQuery,
  currentStatus,
  currentFrom,
  currentTo,
  currentAuthorId,
  currentSortKey,
  currentSortDirection,
  userId,
}: {
  initialItems: WeeklyLogListItem[];
  initialHasMore: boolean;
  totalCount: number;
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentDepartmentName?: string | null;
  currentSearchQuery?: string;
  currentStatus: StatusFilter;
  currentFrom?: string;
  currentTo?: string;
  // Task 040(F040) 신설 축. "내 업무" 위젯이 자기 자신의 id로 좁혀 이동할 때만 쓰이므로,
  // 배지 라벨은 항상 "작성자: 나"로 고정한다(다른 사용자의 id를 지정하는 UI가 없음).
  currentAuthorId?: string;
  currentSortKey: WeeklyLogSortKey | null;
  currentSortDirection: WeeklyLogSortDirection;
  // F045(Task 046) 필터 프리셋의 localStorage 키 네임스페이스. 서버 컴포넌트가 이미 확보한
  // 값을 prop으로 내려받는다(클라이언트에서 세션을 다시 읽지 않음 — F042 draft와 동일 관례).
  userId: string;
}) {
  const router = useRouter();
  // 필터/정렬 변경은 URL 쿼리파라미터만 바뀌는 soft navigation이라 page.tsx의 Suspense
  // fallback(스켈레톤)이 다시 뜨지 않는다 — 서버 재조회 동안 이전 결과가 그대로 남아
  // "화면이 멈춘 것처럼" 보인다. router.push를 transition으로 감싸 isPending을 얻어
  // 상단 로딩 바 + 결과 dim으로 진행 중임을 알린다.
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchInput, setSearchInput] = useState(currentSearchQuery ?? "");

  // 무한 스크롤 상태: 서버가 내려준 첫 배치를 시드로 삼고, 하단 센티넬이 보이면 서버 액션으로
  // 다음 배치를 이어 붙인다. 정렬은 서버 ORDER BY로 처리하므로 여기서 다시 정렬하지 않는다.
  const [items, setItems] = useState<WeeklyLogListItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const [prevKey, setPrevKey] = useState(
    `${currentDepartmentId}::${currentSearchQuery ?? ""}::${currentStatus}::${currentFrom ?? ""}::${currentTo ?? ""}::${currentAuthorId ?? ""}::${currentSortKey ?? ""}::${currentSortDirection}`,
  );

  // 부서/진행상태/기간/검색어/작성자/정렬(서버에서 확정된 값)이 바뀌면 서버가 첫 배치를
  // 다시 내려 initialItems가 갱신되므로, 목록 상태를 그 첫 배치로 되돌린다(뒤로가기·필터
  // 변경 대응). (렌더링 중 상태 조정 — https://react.dev/learn/you-might-not-need-an-effect)
  const currentKey = `${currentDepartmentId}::${currentSearchQuery ?? ""}::${currentStatus}::${currentFrom ?? ""}::${currentTo ?? ""}::${currentAuthorId ?? ""}::${currentSortKey ?? ""}::${currentSortDirection}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setItems(initialItems);
    setHasMore(initialHasMore);
    setSearchInput(currentSearchQuery ?? "");
  }

  // 부서/상태/검색어/기간/작성자/정렬 필터는 클라이언트 상태가 아니라 URL로 관리한다 — 서버
  // 컴포넌트가 searchParams를 읽어 첫 배치를 다시 조회한다. weekly_logs SELECT는 전 부서
  // 공개이므로 이 필터는 관리자 여부와 관계없이 누구나 사용할 수 있다.
  // "전체 부서"를 골랐을 때도 파라미터를 명시적으로 남겨야, 파라미터가 아예 없는
  // 최초 진입(기본값: admin은 전체, 일반 유저는 소속 부서)과 구분된다.
  // from/to/author/sort는 명시적으로 null을 넘기면 해제(파라미터 제거), undefined면 현재
  // 값을 유지한다.
  const navigate = (overrides: {
    department?: string;
    q?: string;
    status?: string;
    from?: string | null;
    to?: string | null;
    author?: string | null;
    sort?: WeeklyLogSortKey | null;
    dir?: WeeklyLogSortDirection;
  }) => {
    const params = new URLSearchParams();
    params.set("department", overrides.department ?? currentDepartmentId);
    params.set("status", overrides.status ?? currentStatus);
    const q = (overrides.q ?? currentSearchQuery ?? "").trim();
    if (q) params.set("q", q);
    const from = overrides.from === null ? "" : (overrides.from ?? currentFrom ?? "");
    const to = overrides.to === null ? "" : (overrides.to ?? currentTo ?? "");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const author = overrides.author === null ? "" : (overrides.author ?? currentAuthorId ?? "");
    if (author) params.set("author", author);
    const sortKey = overrides.sort === null ? null : (overrides.sort ?? currentSortKey);
    if (sortKey) {
      params.set("sort", sortKey);
      params.set("dir", overrides.dir ?? currentSortDirection);
    }
    startTransition(() => {
      router.push(`/protected/weekly-logs?${params.toString()}`);
    });
  };

  const handleDepartmentChange = (value: string) => {
    navigate({ department: value });
  };

  const handleStatusChange = (value: string) => {
    navigate({ status: value });
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ q: searchInput });
  };

  const handleFromChange = (value: string) => {
    navigate({ from: value || null });
  };

  const handleToChange = (value: string) => {
    navigate({ to: value || null });
  };

  const handleDateRangeReset = () => {
    navigate({ from: null, to: null });
  };

  const applyDatePreset = (range: { from: string; to: string }) => {
    navigate({ from: range.from, to: range.to });
  };

  // 저장된 필터 프리셋 적용(F045) — 프리셋에 없는 축은 명시적으로 null/빈 값을 넘겨
  // 현재 화면에 남아 있는 값과 병합되지 않고 프리셋 조건으로 완전히 대체되게 한다.
  const applyFilterPreset = (filters: FilterPresetFilters) => {
    setSearchInput(filters.q);
    navigate({
      department: filters.department,
      status: filters.status,
      q: filters.q,
      from: filters.from,
      to: filters.to,
      author: filters.author,
    });
  };

  // 정렬 헤더 토글은 클라이언트 정렬이 아니라 URL을 바꿔 서버가 첫 배치를 다시 정렬해
  // 내려주게 한다(증분 로딩과 정합). 같은 키 재클릭 → 오름/내림 토글, 다른 키 → 오름차순부터.
  const handleSort = (key: WeeklyLogSortKey) => {
    if (currentSortKey === key) {
      navigate({ sort: key, dir: currentSortDirection === "asc" ? "desc" : "asc" });
    } else {
      navigate({ sort: key, dir: "asc" });
    }
  };

  const rawFilters = {
    department: currentDepartmentId,
    status: currentStatus,
    q: currentSearchQuery ?? "",
    from: currentFrom ?? null,
    to: currentTo ?? null,
    author: currentAuthorId ?? null,
  };
  const rawSort = { key: currentSortKey, direction: currentSortDirection };

  // 하단 센티넬이 보이면 다음 배치를 이어 붙인다. 옵저버가 짧은 순간에 여러 번 발화해도
  // loadingRef로 동시 호출을 막는다(state 갱신 전에 동기적으로 잠금).
  const loadMore = async () => {
    if (loadingRef.current || !hasMore || isPending) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const result = await loadMoreWeeklyLogsAction({
        filters: rawFilters,
        sort: rawSort,
        offset: items.length,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const next = result.items.filter((item) => !seen.has(item.id));
        return next.length > 0 ? [...prev, ...next] : prev;
      });
      setHasMore(result.hasMore);
    } catch {
      toast.error("목록을 불러오지 못했습니다.");
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  // IntersectionObserver 콜백이 항상 최신 loadMore(최신 items/hasMore/필터 클로저)를 부르도록
  // ref로 넘긴다 — 옵저버는 한 번만 설치하고 재설치하지 않는다. ref 갱신은 렌더 중이 아니라
  // 커밋 후(effect)에 한다.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current();
        }
      },
      // 센티넬이 화면에 완전히 닿기 전(200px 전방)에 미리 로딩을 시작해 끊김을 줄인다.
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scopeLabel = currentDepartmentName ?? "전체 팀";

  // 화면에 보이는 필터 결과와 PDF가 항상 일치해야 하므로(MVP Task 013 설계 원칙),
  // 현재 적용된 기간 필터를 그대로 PDF 헤더 문구로 전달한다.
  const dateRangeLabel =
    currentFrom || currentTo
      ? `${currentFrom ? formatDate(currentFrom) : "제한없음"} ~ ${currentTo ? formatDate(currentTo) : "제한없음"}`
      : undefined;

  // 무한 스크롤로는 화면에 일부만 로드돼 있으므로, 다운로드 시점에 현재 필터·정렬 기준
  // 전체를 서버에서 다시 조회한다(화면 결과와 항상 일치).
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const result = await loadAllWeeklyLogsForExportAction({ filters: rawFilters, sort: rawSort });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      await downloadWeeklyLogListPdf({
        items: result.items,
        departmentLabel: scopeLabel,
        dateRangeLabel,
      });
    } catch {
      toast.error("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Excel은 목록 조회에 없는 업무 속성(업무타입/중요도/예상소요기간·금액/협력업체/내용)까지
  // 담아야 하므로, 전체 목록을 조회한 뒤 그 id들로 상세를 별도 조회해 병합한다.
  // weekly_logs SELECT는 전 부서 공개이므로 부서와 무관하게 조회할 수 있다.
  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const result = await loadAllWeeklyLogsForExportAction({ filters: rawFilters, sort: rawSort });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const ids = result.items.map((item) => item.id);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("weekly_logs")
        .select("id, work_type, importance, estimated_mm, estimated_cost, partner_company, content")
        .in("id", ids);
      if (error) throw error;

      const detailsById = new Map(data.map((row) => [row.id, row]));
      const exportItems: WeeklyLogExportItem[] = result.items.map((item) => {
        const details = detailsById.get(item.id);
        return {
          ...item,
          work_type: (details?.work_type ?? []) as WeeklyLogExportItem["work_type"],
          importance: (details?.importance ?? 3) as WeeklyLogExportItem["importance"],
          estimated_mm: details?.estimated_mm ?? null,
          estimated_cost: details?.estimated_cost ?? null,
          partner_company: details?.partner_company ?? null,
          content: details?.content ?? "",
        };
      });

      await downloadWeeklyLogListExcel({
        items: exportItems,
        departmentLabel: scopeLabel,
        dateRangeLabel,
      });
    } catch {
      toast.error("Excel 생성 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  // 활성 필터 요약: 4종 필터가 조합되면 "왜 결과가 0건인지" 알기 어려워지므로
  // 기본값(전체 부서/전체 상태/검색어 없음/기간 없음)과 다른 항목만 배지로 노출한다.
  type ActiveFilterBadge = { key: string; label: string; onRemove: () => void };
  const activeFilters: ActiveFilterBadge[] = [];
  if (currentDepartmentId !== ALL_DEPARTMENTS_FILTER) {
    activeFilters.push({
      key: "department",
      label: `팀: ${scopeLabel}`,
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
  // 기간은 배지로 다시 보여주지 않는다 — 바로 위 날짜 입력창이 이미 같은 값을 항상
  // 보여주고 있어(초기화 버튼도 그 옆에 있음) 배지로 한 번 더 표시하면 순수 중복이다.
  // author는 "내 업무" 위젯이 본인 id로만 링크를 만들기 때문에(다른 사용자를 지정하는
  // UI가 없음) 라벨을 항상 "나"로 고정한다.
  if (currentAuthorId) {
    activeFilters.push({
      key: "author",
      label: "작성자: 나",
      onRemove: () => navigate({ author: null }),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <LoadingBar active={isPending} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeeklyLogViewSwitcher current="list" filters={rawFilters} />
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" disabled={isDownloading}>
                {isDownloading ? "생성 중..." : "다운로드"}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleDownloadPdf}>PDF 다운로드</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDownloadExcel}>Excel 다운로드</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link href="/protected/weekly-logs/new">신규 작성</Link>
          </Button>
        </div>
      </div>
      {/* 필터 컨트롤 전체를 카드 하나로 감싸 아래 목록/카드 콘텐츠와 시각적으로
          분리한다 — 배경 없이 여백만으로 구분되던 이전 레이아웃은 "필터 영역이
          어디까지인지" 스캔하기 어렵다는 피드백에 따른 개선. */}
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
          <Select value={currentDepartmentId} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="w-48" aria-label="팀 필터">
              <SelectValue placeholder="팀 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENTS_FILTER}>전체 팀</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.archived_at ? `${dept.name} (비활성)` : dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={currentStatus} onValueChange={handleStatusChange}>
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
          <WeeklyLogFilterPresets
            userId={userId}
            currentFilters={rawFilters}
            onApply={applyFilterPreset}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            from={currentFrom}
            to={currentTo}
            onFromChange={handleFromChange}
            onToChange={handleToChange}
            onReset={handleDateRangeReset}
            onPreset={applyDatePreset}
          />
          {/* 현재 필터 조건에 맞는 총 건수 — 기간 프리셋("최근 3개월") 오른쪽에 우측 정렬. */}
          <p className="text-muted-foreground ml-auto text-sm">
            {activeFilters.length > 0 ? "조건에 맞는 업무" : "총 업무"}{" "}
            <span className="text-foreground font-medium">
              {totalCount.toLocaleString()}
            </span>
            건
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
      {/* 재조회 중에는 이전 결과를 흐리게+비활성화해 "갱신 중"임을 알리되, 컨텍스트(무엇을
          보고 있었는지)는 유지한다. 필터 UI는 위에 있어 이 dim의 영향을 받지 않는다. */}
      <div
        className={cn(
          "flex flex-col gap-4 transition-opacity",
          isPending && "pointer-events-none opacity-60",
        )}
        aria-busy={isPending}
      >
        {items.length === 0 ? (
          <EmptyState
            title={
              activeFilters.length > 0 ? "검색 결과가 없습니다" : "등록된 주간업무일지가 없습니다"
            }
            description={
              activeFilters.length > 0
                ? "위 필터를 조정하거나 개별 배지를 해제해보세요."
                : "신규 작성 버튼을 눌러 첫 업무일지를 작성해보세요."
            }
          />
        ) : (
          <>
            <WeeklyLogTable
              items={items}
              showAuthor
              sortKey={currentSortKey}
              sortDirection={currentSortDirection}
              onSort={handleSort}
              query={currentSearchQuery}
            />
            <WeeklyLogCardList items={items} showAuthor query={currentSearchQuery} />
            {/* 더 있으면 하단 센티넬을 두고, 화면에 들어오면 다음 배치를 로딩한다. 진행률을
                알 수 없는 조회라 비결정형 인디케이터 바로 "불러오는 중"만 알린다. */}
            {hasMore && (
              <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-4">
                <LoadingBar active className="max-w-xs" />
                <p className="text-muted-foreground text-sm">
                  {isLoadingMore ? "불러오는 중..." : "스크롤하면 더 불러옵니다"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
