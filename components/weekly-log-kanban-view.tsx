"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeeklyLogKanbanColumn } from "@/components/weekly-log-kanban-column";
import { WeeklyLogKanbanCardContent } from "@/components/weekly-log-kanban-card";
import { DateRangeFilter } from "@/components/date-range-filter";
import { LoadingBar } from "@/components/loading-bar";
import { cn } from "@/lib/utils";
import { updateWeeklyLogStatusAction } from "@/lib/actions/weekly-log";
import { loadMoreKanbanColumnAction } from "@/lib/actions/weekly-log-list";
import { formatDate, getStatusLabel } from "@/lib/format";
import { ALL_DEPARTMENTS_FILTER, ALL_STATUSES_FILTER } from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  StatusFilter,
  WeeklyLogKanbanColumn as WeeklyLogKanbanColumnData,
  WeeklyLogListItem,
  WeeklyLogStatus,
} from "@/lib/types";

const STATUS_ORDER: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];
const STATUS_FILTER_OPTIONS: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

type ColumnState = { items: WeeklyLogListItem[]; hasMore: boolean; total: number };
type ColumnMap = Record<WeeklyLogStatus, ColumnState>;

function toColumnMap(columns: WeeklyLogKanbanColumnData[]): ColumnMap {
  const map = {} as ColumnMap;
  for (const column of columns) {
    map[column.status] = { items: column.items, hasMore: column.hasMore, total: column.total };
  }
  return map;
}

// 목표종료일 오름차순(칸반 컬럼 정렬 기준, lib/queries/weekly-logs.ts의 KANBAN_SORT)을 낙관적
// 업데이트에서도 유지하기 위한 삽입 위치 계산 — 재조회 없이도 카드가 엉뚱한 순서로 튀지 않는다.
function insertSorted(items: WeeklyLogListItem[], item: WeeklyLogListItem): WeeklyLogListItem[] {
  const index = items.findIndex((existing) => existing.target_end_date > item.target_end_date);
  if (index === -1) return [...items, item];
  return [...items.slice(0, index), item, ...items.slice(index)];
}

export function WeeklyLogKanbanView({
  initialColumns,
  departments,
  currentDepartmentId,
  currentDepartmentName,
  currentSearchQuery,
  currentStatus,
  currentFrom,
  currentTo,
  currentUserDepartmentId,
  isAdmin,
  todayIso,
}: {
  initialColumns: WeeklyLogKanbanColumnData[];
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentDepartmentName?: string | null;
  currentSearchQuery?: string;
  currentStatus: StatusFilter;
  currentFrom?: string;
  currentTo?: string;
  currentUserDepartmentId: string;
  isAdmin: boolean;
  todayIso: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearchQuery ?? "");
  const [columns, setColumns] = useState<ColumnMap>(() => toColumnMap(initialColumns));
  const [loadingMoreStatus, setLoadingMoreStatus] = useState<WeeklyLogStatus | null>(null);
  const [activeItem, setActiveItem] = useState<WeeklyLogListItem | null>(null);

  // 마우스로 카드를 살짝 누르기만 해도(제목 클릭 등) 드래그로 오인되지 않도록 최소 이동
  // 거리를 둔다 — 목록 페이지와 달리 카드 전체가 드래그 핸들이라 클릭과의 구분이 필요하다.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filterKey = `${currentDepartmentId}::${currentSearchQuery ?? ""}::${currentStatus}::${currentFrom ?? ""}::${currentTo ?? ""}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setColumns(toColumnMap(initialColumns));
    setSearchInput(currentSearchQuery ?? "");
  }

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
    startTransition(() => {
      router.push(`/protected/weekly-logs/kanban?${params.toString()}`);
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
    from: currentFrom ?? null,
    to: currentTo ?? null,
  };

  const loadMoreColumn = async (status: WeeklyLogStatus) => {
    if (loadingMoreStatus) return;
    setLoadingMoreStatus(status);
    try {
      const result = await loadMoreKanbanColumnAction({
        filters: rawFilters,
        status,
        offset: columns[status].items.length,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setColumns((prev) => {
        const existing = prev[status];
        const seen = new Set(existing.items.map((item) => item.id));
        const next = result.items.filter((item) => !seen.has(item.id));
        return {
          ...prev,
          [status]: { ...existing, items: [...existing.items, ...next], hasMore: result.hasMore },
        };
      });
    } catch {
      toast.error("목록을 불러오지 못했습니다.");
    } finally {
      setLoadingMoreStatus(null);
    }
  };

  // 카드 이동(드래그앤드롭 또는 카드의 "진행상태 이동" 메뉴, 둘 다 이 함수로 귀결) — 즉시
  // 화면에 반영(낙관적 업데이트)하고, 서버 액션 실패 시(RLS로 막힌 타 부서 업무 등) 원래
  // 컬럼으로 되돌리며 에러 토스트를 띄운다.
  const moveItem = async (item: WeeklyLogListItem, targetStatus: WeeklyLogStatus) => {
    const sourceStatus = item.status;
    if (sourceStatus === targetStatus) return;

    setColumns((prev) => ({
      ...prev,
      [sourceStatus]: {
        ...prev[sourceStatus],
        items: prev[sourceStatus].items.filter((i) => i.id !== item.id),
        total: Math.max(0, prev[sourceStatus].total - 1),
      },
      [targetStatus]: {
        ...prev[targetStatus],
        items: insertSorted(prev[targetStatus].items, { ...item, status: targetStatus }),
        total: prev[targetStatus].total + 1,
      },
    }));

    const result = await updateWeeklyLogStatusAction(item.id, targetStatus);
    if (!result.success) {
      toast.error(result.error);
      setColumns((prev) => ({
        ...prev,
        [targetStatus]: {
          ...prev[targetStatus],
          items: prev[targetStatus].items.filter((i) => i.id !== item.id),
          total: Math.max(0, prev[targetStatus].total - 1),
        },
        [sourceStatus]: {
          ...prev[sourceStatus],
          items: insertSorted(prev[sourceStatus].items, { ...item, status: sourceStatus }),
          total: prev[sourceStatus].total + 1,
        },
      }));
    }
  };

  const findItem = (id: string): WeeklyLogListItem | null => {
    for (const status of STATUS_ORDER) {
      const found = columns[status].items.find((item) => item.id === id);
      if (found) return found;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(findItem(String(event.active.id)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;
    const item = findItem(String(active.id));
    if (!item) return;
    void moveItem(item, over.id as WeeklyLogStatus);
  };

  const scopeLabel = currentDepartmentName ?? "전체 부서";
  const dateRangeLabel =
    currentFrom || currentTo
      ? `${currentFrom ? formatDate(currentFrom) : "제한없음"} ~ ${currentTo ? formatDate(currentTo) : "제한없음"}`
      : undefined;

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
      onRemove: () => navigate({ from: null, to: null }),
    });
  }

  const totalCount = STATUS_ORDER.reduce((sum, status) => sum + columns[status].total, 0);
  const activeOverdue =
    !!activeItem && activeItem.status !== "completed" && activeItem.target_end_date < todayIso;

  return (
    <div className="flex flex-col gap-4">
      <LoadingBar active={isPending} />
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
          {activeFilters.length > 0 ? "조건에 맞는 업무" : "총 업무"}{" "}
          <span className="text-foreground font-medium">{totalCount.toLocaleString()}</span>건
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
      <div
        className={cn("transition-opacity", isPending && "pointer-events-none opacity-60")}
        aria-busy={isPending}
      >
        <DndContext
          // dnd-kit이 접근성 안내용으로 자동 생성하는 id는 SSR과 클라이언트 렌더 사이에
          // 어긋나 하이드레이션 경고를 일으킬 수 있다(dnd-kit SSR 가이드 권장 사항) — 고정
          // id를 명시해 서버/클라이언트가 항상 같은 값을 쓰게 한다.
          id="weekly-log-kanban-board"
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* 상태 컬럼은 항상 3개로 고정이라 가변 개수의 가로 스크롤 대신 그리드로 배치한다.
              lg 미만(태블릿·모바일)에서는 1열로 쌓아 각 컬럼이 화면 폭을 꽉 채우고, lg
              이상(데스크탑)에서는 3열이 컨테이너 폭 전체를 균등하게 채운다 — 컬럼 폭을
              고정값(w-72)으로 두면 모바일에서 다음 컬럼이 애매하게 잘려 보이고, 데스크탑
              에서는 넓은 화면에서 오른쪽에 빈 여백이 남는 문제가 있었다. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {STATUS_ORDER.map((status) => (
              <WeeklyLogKanbanColumn
                key={status}
                status={status}
                items={columns[status].items}
                total={columns[status].total}
                hasMore={columns[status].hasMore}
                isLoadingMore={loadingMoreStatus === status}
                onLoadMore={() => loadMoreColumn(status)}
                onMoveStatus={(item, target) => void moveItem(item, target)}
                currentUserDepartmentId={currentUserDepartmentId}
                isAdmin={isAdmin}
                todayIso={todayIso}
              />
            ))}
          </div>
          <DragOverlay>
            {activeItem ? (
              <Card className="w-72 p-3 shadow-lg">
                <WeeklyLogKanbanCardContent
                  item={activeItem}
                  overdue={activeOverdue}
                  interactive={false}
                />
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
