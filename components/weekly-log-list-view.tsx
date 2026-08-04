"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { WeeklyLogTable } from "@/components/weekly-log-table";
import { WeeklyLogCardList } from "@/components/weekly-log-card";
import { EmptyState } from "@/components/empty-state";
import { downloadWeeklyLogListPdf } from "@/lib/pdf/weekly-log-pdf";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  WeeklyLogListItem,
} from "@/lib/types";

const PAGE_SIZE = 20;

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
}: {
  items: WeeklyLogListItem[];
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentDepartmentName?: string | null;
  currentSearchQuery?: string;
}) {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState(currentSearchQuery ?? "");
  const [prevKey, setPrevKey] = useState(
    `${currentDepartmentId}::${currentSearchQuery ?? ""}`,
  );

  // 부서 필터나 검색어(서버에서 확정된 값)가 바뀌면 항목 목록이 통째로 달라지므로
  // 페이지를 1로 되돌리고 입력값도 최신 서버 상태와 맞춘다(뒤로가기 대응).
  // (렌더링 중 상태 조정 — https://react.dev/learn/you-might-not-need-an-effect)
  const currentKey = `${currentDepartmentId}::${currentSearchQuery ?? ""}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setCurrentPage(1);
    setSearchInput(currentSearchQuery ?? "");
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(
    () => items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [items, safePage],
  );

  // 부서 필터/검색어는 클라이언트 상태가 아니라 URL(?department=&q=)로 관리한다 —
  // 서버 컴포넌트가 searchParams를 읽어 매번 다시 조회한다. weekly_logs SELECT는
  // 전 부서 공개이므로 이 필터는 관리자 여부와 관계없이 누구나 사용할 수 있다.
  // "전체 부서"를 골랐을 때도 파라미터를 명시적으로 남겨야, 파라미터가 아예 없는
  // 최초 진입(기본값: admin은 전체, 일반 유저는 소속 부서)과 구분된다.
  const navigate = (overrides: { department?: string; q?: string }) => {
    const params = new URLSearchParams();
    params.set("department", overrides.department ?? currentDepartmentId);
    const q = (overrides.q ?? currentSearchQuery ?? "").trim();
    if (q) params.set("q", q);
    router.push(`/protected/weekly-logs?${params.toString()}`);
  };

  const handleDepartmentChange = (value: string) => {
    navigate({ department: value });
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ q: searchInput });
  };

  const scopeLabel = currentDepartmentName ?? "전체 부서";

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadWeeklyLogListPdf({ items, departmentLabel: scopeLabel });
    } catch {
      toast.error("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

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
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isDownloading}
            onClick={handleDownloadPdf}
          >
            {isDownloading ? "생성 중..." : "PDF 다운로드"}
          </Button>
          <Button asChild>
            <Link href="/protected/weekly-logs/new">신규 작성</Link>
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title={
            currentSearchQuery
              ? "검색 결과가 없습니다"
              : "등록된 주간업무일지가 없습니다"
          }
          description={
            currentSearchQuery
              ? "다른 검색어로 다시 시도해보세요."
              : "신규 작성 버튼을 눌러 첫 업무일지를 작성해보세요."
          }
        />
      ) : (
        <>
          <WeeklyLogTable items={pagedItems} showDepartment />
          <WeeklyLogCardList items={pagedItems} showDepartment />
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
