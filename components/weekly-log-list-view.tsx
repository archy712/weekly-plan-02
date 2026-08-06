"use client";

import { useMemo, useState, type FormEvent } from "react";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { WeeklyLogTable, type SortDirection, type WeeklyLogSortKey } from "@/components/weekly-log-table";
import { WeeklyLogCardList } from "@/components/weekly-log-card";
import { EmptyState } from "@/components/empty-state";
import { DateRangeFilter } from "@/components/date-range-filter";
import { downloadWeeklyLogListPdf } from "@/lib/pdf/weekly-log-pdf";
import { downloadWeeklyLogListExcel } from "@/lib/excel/weekly-log-excel";
import { createClient } from "@/lib/supabase/client";
import { formatDate, getStatusLabel } from "@/lib/format";
import { ALL_DEPARTMENTS_FILTER, ALL_STATUSES_FILTER } from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  StatusFilter,
  WeeklyLogExportItem,
  WeeklyLogListItem,
  WeeklyLogStatus,
} from "@/lib/types";

const STATUS_FILTER_OPTIONS: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

const PAGE_SIZE = 20;

// 진행상태는 알파벳/가나다 순이 아니라 업무 흐름 순서(예정 → 진행중 → 완료)로 정렬해야
// 의미가 통하므로 별도 순위표를 둔다.
const STATUS_SORT_RANK: Record<WeeklyLogStatus, number> = {
  planned: 0,
  in_progress: 1,
  completed: 2,
};

// 총 페이지가 많을 때 앞/뒤/현재 주변만 보여주고 나머지는 생략(...) 처리한다.
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) {
      result.push("ellipsis");
    }
    result.push(page);
    previous = page;
  }
  return result;
}

export function WeeklyLogListView({
  items,
  departments,
  currentDepartmentId,
  currentDepartmentName,
  currentSearchQuery,
  currentStatus,
  currentFrom,
  currentTo,
}: {
  items: WeeklyLogListItem[];
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentDepartmentName?: string | null;
  currentSearchQuery?: string;
  currentStatus: StatusFilter;
  currentFrom?: string;
  currentTo?: string;
}) {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState(currentSearchQuery ?? "");
  const [sortKey, setSortKey] = useState<WeeklyLogSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [prevKey, setPrevKey] = useState(
    `${currentDepartmentId}::${currentSearchQuery ?? ""}::${currentStatus}::${currentFrom ?? ""}::${currentTo ?? ""}`,
  );

  // 부서/진행상태/기간 필터나 검색어(서버에서 확정된 값)가 바뀌면 항목 목록이 통째로
  // 달라지므로 페이지를 1로 되돌리고 입력값도 최신 서버 상태와 맞춘다(뒤로가기 대응).
  // (렌더링 중 상태 조정 — https://react.dev/learn/you-might-not-need-an-effect)
  const currentKey = `${currentDepartmentId}::${currentSearchQuery ?? ""}::${currentStatus}::${currentFrom ?? ""}::${currentTo ?? ""}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setCurrentPage(1);
    setSearchInput(currentSearchQuery ?? "");
  }

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const sorted = [...items].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "title":
          comparison = a.title.localeCompare(b.title, "ko");
          break;
        case "author_name": {
          const nameA = a.author_name ?? a.author_email ?? "";
          const nameB = b.author_name ?? b.author_email ?? "";
          comparison = nameA.localeCompare(nameB, "ko");
          break;
        }
        case "start_date":
          comparison = a.start_date.localeCompare(b.start_date);
          break;
        case "target_end_date":
          comparison = a.target_end_date.localeCompare(b.target_end_date);
          break;
        case "status":
          comparison = STATUS_SORT_RANK[a.status] - STATUS_SORT_RANK[b.status];
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [items, sortKey, sortDirection]);

  const handleSort = (key: WeeklyLogSortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(
    () => sortedItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedItems, safePage],
  );

  // 부서/상태/검색어/기간 필터는 클라이언트 상태가 아니라 URL(?department=&q=&from=&to=)로
  // 관리한다 — 서버 컴포넌트가 searchParams를 읽어 매번 다시 조회한다. weekly_logs SELECT는
  // 전 부서 공개이므로 이 필터는 관리자 여부와 관계없이 누구나 사용할 수 있다.
  // "전체 부서"를 골랐을 때도 파라미터를 명시적으로 남겨야, 파라미터가 아예 없는
  // 최초 진입(기본값: admin은 전체, 일반 유저는 소속 부서)과 구분된다.
  // from/to는 명시적으로 null을 넘기면 해제(파라미터 제거), undefined면 현재 값을 유지한다.
  const navigate = (overrides: {
    department?: string;
    q?: string;
    status?: string;
    from?: string | null;
    to?: string | null;
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
    router.push(`/protected/weekly-logs?${params.toString()}`);
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

  const scopeLabel = currentDepartmentName ?? "전체 부서";

  // 화면에 보이는 필터 결과와 PDF가 항상 일치해야 하므로(MVP Task 013 설계 원칙),
  // 현재 적용된 기간 필터를 그대로 PDF 헤더 문구로 전달한다.
  const dateRangeLabel =
    currentFrom || currentTo
      ? `${currentFrom ? formatDate(currentFrom) : "제한없음"} ~ ${currentTo ? formatDate(currentTo) : "제한없음"}`
      : undefined;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadWeeklyLogListPdf({ items: sortedItems, departmentLabel: scopeLabel, dateRangeLabel });
    } catch {
      toast.error("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Excel은 목록 조회에 없는 업무 속성(업무타입/중요도/예상소요기간·금액/협력업체/내용)까지
  // 담아야 하므로, 목록 페이로드를 무겁게 만들지 않기 위해 다운로드 시점에만 별도 조회한다.
  // weekly_logs SELECT는 전 부서 공개이므로 부서와 무관하게 조회할 수 있다.
  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const ids = sortedItems.map((item) => item.id);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("weekly_logs")
        .select("id, work_type, importance, estimated_mm, estimated_cost, partner_company, content")
        .in("id", ids);
      if (error) throw error;

      const detailsById = new Map(data.map((row) => [row.id, row]));
      const exportItems: WeeklyLogExportItem[] = sortedItems.map((item) => {
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

      await downloadWeeklyLogListExcel({ items: exportItems, departmentLabel: scopeLabel, dateRangeLabel });
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
  if (currentFrom || currentTo) {
    activeFilters.push({
      key: "date",
      label: `기간: ${dateRangeLabel}`,
      onRemove: handleDateRangeReset,
    });
  }

  return (
    <div className="flex flex-col gap-4">
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
            onValueChange={handleDepartmentChange}
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
          <Select value={currentStatus} onValueChange={handleStatusChange}>
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
      <DateRangeFilter
        from={currentFrom}
        to={currentTo}
        onFromChange={handleFromChange}
        onToChange={handleToChange}
        onReset={handleDateRangeReset}
        onPreset={applyDatePreset}
      />
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
            items={pagedItems}
            showAuthor
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <WeeklyLogCardList items={pagedItems} showAuthor />
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (safePage > 1) setCurrentPage(safePage - 1);
                    }}
                    className={safePage === 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                {getPageNumbers(safePage, totalPages).map((page, index) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === safePage}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (safePage < totalPages) setCurrentPage(safePage + 1);
                    }}
                    className={
                      safePage === totalPages ? "pointer-events-none opacity-50" : undefined
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
