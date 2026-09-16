"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkTypeRowActions } from "@/components/work-type-row-actions";
import { reorderWorkTypesAction } from "@/lib/actions/work-type";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/types";

export type WorkTypeListItem = {
  id: string;
  name: string;
  archived_at: string | null;
  organization_id: string;
  organization_name: string;
  sort_order: number;
};

// @dnd-kit/sortable을 새로 설치하는 대신 칸반보드와 동일하게 @dnd-kit/core만으로 구현한다
// (행 하나가 draggable이자 droppable이고, 놓인 행의 자리로 이동시키는 방식). 목록이 수십 건
// 규모라 sortable 패키지의 가상 좌표 계산까지는 필요 없다.
function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// 행(또는 카드) 하나에 드래그 소스와 드롭 타깃을 함께 건다. 드래그 시작은 핸들에서만
// 가능하도록 listeners를 setActivatorNodeRef가 가리키는 핸들 버튼에만 붙인다 — 행 전체가
// 드래그 소스가 되면 "수정/삭제" 버튼 클릭과 충돌한다.
function useSortableRow(id: string) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    setActivatorNodeRef,
    isDragging,
  } = useDraggable({ id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });

  const setRowRef = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  return { attributes, listeners, setActivatorNodeRef, setRowRef, isDragging, isOver };
}

function DragHandle({
  name,
  setActivatorNodeRef,
  listeners,
  attributes,
}: {
  name: string;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  listeners: ReturnType<typeof useSortableRow>["listeners"];
  attributes: ReturnType<typeof useSortableRow>["attributes"];
}) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring cursor-grab touch-none rounded p-1 focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
      aria-label={`${name} 순서 변경`}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}

function SortableWorkTypeRow({
  workType,
  position,
  logCount,
  organizations,
}: {
  workType: WorkTypeListItem;
  position: number;
  logCount: number;
  organizations: Organization[];
}) {
  const { attributes, listeners, setActivatorNodeRef, setRowRef, isDragging, isOver } =
    useSortableRow(workType.id);
  const isArchived = Boolean(workType.archived_at);

  return (
    <TableRow
      ref={setRowRef}
      className={cn(
        isDragging && "opacity-40",
        // 드롭 위치를 알리는 표시 — @dnd-kit/sortable처럼 항목이 실시간으로 밀려나지는
        // 않으므로, 놓이게 될 행을 테두리로 강조해 어디로 이동하는지 알려준다.
        isOver && !isDragging && "ring-primary bg-primary/5 ring-2 ring-inset",
      )}
    >
      <TableCell className="w-10 py-3 pl-4">
        <DragHandle
          name={workType.name}
          setActivatorNodeRef={setActivatorNodeRef}
          listeners={listeners}
          attributes={attributes}
        />
      </TableCell>
      <TableCell className="text-muted-foreground w-16 py-3 tabular-nums">{position}</TableCell>
      <TableCell className="py-3 font-medium">{workType.name}</TableCell>
      <TableCell className="text-muted-foreground py-3">{workType.organization_name}</TableCell>
      <TableCell className="text-muted-foreground py-3 tabular-nums">{logCount}건</TableCell>
      <TableCell className="py-3">
        <Badge variant={isArchived ? "secondary" : "success"}>
          {isArchived ? "비활성" : "활성"}
        </Badge>
      </TableCell>
      <TableCell className="py-3 pr-4">
        <WorkTypeRowActions
          workType={workType}
          organizations={organizations}
          logCount={logCount}
        />
      </TableCell>
    </TableRow>
  );
}

function SortableWorkTypeCard({
  workType,
  position,
  logCount,
  organizations,
}: {
  workType: WorkTypeListItem;
  position: number;
  logCount: number;
  organizations: Organization[];
}) {
  const { attributes, listeners, setActivatorNodeRef, setRowRef, isDragging, isOver } =
    useSortableRow(workType.id);
  const isArchived = Boolean(workType.archived_at);

  return (
    <Card
      ref={setRowRef}
      className={cn(
        isDragging && "opacity-40",
        isOver && !isDragging && "ring-primary bg-primary/5 ring-2",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <DragHandle
            name={workType.name}
            setActivatorNodeRef={setActivatorNodeRef}
            listeners={listeners}
            attributes={attributes}
          />
          <CardTitle className="min-w-0 text-base">{workType.name}</CardTitle>
        </div>
        <Badge
          className="shrink-0 whitespace-nowrap"
          variant={isArchived ? "secondary" : "success"}
        >
          {isArchived ? "비활성" : "활성"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>정렬순서 {position}</span>
          <span>{workType.organization_name}</span>
          <span>진행업무 {logCount}건</span>
        </div>
        <WorkTypeRowActions
          workType={workType}
          organizations={organizations}
          logCount={logCount}
        />
      </CardContent>
    </Card>
  );
}

export function WorkTypeSortableList({
  workTypes,
  organizations,
  logCounts,
}: {
  // 조직(부문)명 → sort_order 순으로 이미 정렬된 상태로 내려받는다.
  workTypes: WorkTypeListItem[];
  organizations: Organization[];
  // Map은 서버→클라이언트 직렬화 대상에서 제외하고 평범한 객체로 넘긴다.
  logCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(workTypes);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 순서 저장 후 router.refresh()나 다른 행의 추가/수정으로 서버 데이터가 새로 내려오면
  // 그 값으로 되돌린다(칸반 뷰의 initialColumns 동기화와 동일한 패턴).
  const [prevWorkTypes, setPrevWorkTypes] = useState(workTypes);
  if (workTypes !== prevWorkTypes) {
    setPrevWorkTypes(workTypes);
    setItems(workTypes);
  }

  // 핸들을 살짝 누르기만 해도 드래그로 오인되지 않도록 최소 이동 거리를 둔다(칸반과 동일).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // 화면에 보여줄 "정렬순서"는 DB의 sort_order 원값이 아니라 조직 안에서의 1-based 위치다 —
  // 드래그 직후(저장 전) 낙관적 상태에서도 항상 1..N으로 이어져 보인다.
  const positions = new Map<string, number>();
  const seenPerOrganization = new Map<string, number>();
  for (const item of items) {
    const next = (seenPerOrganization.get(item.organization_id) ?? 0) + 1;
    seenPerOrganization.set(item.organization_id, next);
    positions.set(item.id, next);
  }

  const persistOrder = async (
    nextItems: WorkTypeListItem[],
    organizationId: string,
    previousItems: WorkTypeListItem[],
  ) => {
    const orderedIds = nextItems
      .filter((item) => item.organization_id === organizationId)
      .map((item) => item.id);

    try {
      const result = await reorderWorkTypesAction(orderedIds);
      if (!result.success) {
        setItems(previousItems);
        toast.error(result.error);
        return;
      }
      toast.success("업무 타입 순서가 저장되었습니다.");
      router.refresh();
    } catch {
      setItems(previousItems);
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from === -1 || to === -1) return;

    // 정렬은 부문 안에서만 의미가 있다(reorder_work_types RPC도 서버에서 동일하게 막는다).
    // 슈퍼관리자는 전 부문을 한 테이블에서 보므로 이 경계를 넘는 드래그가 실제로 발생한다.
    if (items[from].organization_id !== items[to].organization_id) {
      toast.error("다른 부문의 업무 타입과는 순서를 바꿀 수 없습니다.");
      return;
    }

    const previousItems = items;
    const nextItems = arrayMove(items, from, to);
    setItems(nextItems);
    void persistOrder(nextItems, items[from].organization_id, previousItems);
  };

  const activeItem = activeId ? (items.find((item) => item.id === activeId) ?? null) : null;

  // 드래그 중인 항목의 미리보기. 테이블 행(tr)은 테이블 밖에서 렌더링할 수 없으므로 칸반의
  // DragOverlay와 마찬가지로 이름만 담은 카드로 대체한다. 카드/테이블 두 컨텍스트가 각자
  // 자기 오버레이를 가져야 해(DragOverlay는 소속 DndContext의 드래그만 그린다) 공용으로 뽑는다.
  const dragPreview = activeItem ? (
    <div className="bg-background flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-lg">
      <GripVertical className="text-muted-foreground size-4" aria-hidden />
      {activeItem.name}
    </div>
  ) : null;

  return (
    <>
      <p className="text-muted-foreground text-sm">
        손잡이를 끌어 순서를 바꾸면 진행업무 등록·수정 화면의 업무 타입 순서에 그대로
        반영됩니다.
      </p>
      {/* 모바일 카드와 데스크탑 테이블은 같은 항목을 두 번 렌더링하므로 DndContext를 각각
          따로 둔다 — 하나의 DndContext 안에서 같은 id가 중복 등록되면 dnd-kit이 깨진다
          (칸반보드가 컬럼을 두 번 렌더링하지 않는 것과 같은 이유). 두 컨텍스트는 서로
          독립적인 레지스트리를 갖기 때문에 id가 겹쳐도 무방하다. */}
      <DndContext
        id="work-type-sort-cards"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-2 md:hidden">
          {items.map((workType) => (
            <SortableWorkTypeCard
              key={workType.id}
              workType={workType}
              position={positions.get(workType.id) ?? 0}
              logCount={logCounts[workType.id] ?? 0}
              organizations={organizations}
            />
          ))}
        </div>
        <DragOverlay>{dragPreview}</DragOverlay>
      </DndContext>
      <DndContext
        id="work-type-sort-rows"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden overflow-hidden rounded-lg border shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-foreground h-11 w-10 pl-4 text-sm font-bold tracking-wide uppercase">
                  <span className="sr-only">순서 변경</span>
                </TableHead>
                <TableHead className="text-foreground h-11 w-16 text-sm font-bold tracking-wide uppercase">
                  정렬순서
                </TableHead>
                <TableHead className="text-foreground h-11 text-sm font-bold tracking-wide uppercase">
                  업무 타입명
                </TableHead>
                <TableHead className="text-foreground h-11 text-sm font-bold tracking-wide uppercase">
                  소속 부문
                </TableHead>
                <TableHead className="text-foreground h-11 text-sm font-bold tracking-wide uppercase">
                  진행업무 수
                </TableHead>
                <TableHead className="text-foreground h-11 text-sm font-bold tracking-wide uppercase">
                  상태
                </TableHead>
                <TableHead className="text-foreground h-11 pr-4 text-right text-sm font-bold tracking-wide uppercase">
                  액션
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((workType) => (
                <SortableWorkTypeRow
                  key={workType.id}
                  workType={workType}
                  position={positions.get(workType.id) ?? 0}
                  logCount={logCounts[workType.id] ?? 0}
                  organizations={organizations}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        <DragOverlay>{dragPreview}</DragOverlay>
      </DndContext>
    </>
  );
}
