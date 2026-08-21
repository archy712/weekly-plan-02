"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRightLeft, GripVertical, Lock } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WeeklyLogReactionCounts } from "@/components/weekly-log-reaction-counts";
import { HighlightedText } from "@/components/highlighted-text";
import { formatDate, getStatusLabel } from "@/lib/format";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { cn } from "@/lib/utils";
import type { WeeklyLogListItem, WeeklyLogStatus } from "@/lib/types";

const STATUS_ORDER: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

// 카드 시각 정보(제목/작성자/기간/댓글·반응수)는 목록 화면(WeeklyLogCard)과 동일하게
// 구성하되, 부서 정보를 추가로 노출한다 — 칸반보드는 진행상태로 묶여 부서가 뒤섞이므로
// 목록과 달리 어느 부서 업무인지가 한눈에 필요하다.
export function WeeklyLogKanbanCardContent({
  item,
  overdue,
  interactive = true,
  query,
}: {
  item: WeeklyLogListItem;
  overdue: boolean;
  interactive?: boolean;
  // F046 검색 결과 하이라이팅 — 칸반도 목록과 같은 q 필터를 쓰므로 함께 적용한다.
  query?: string;
}) {
  const titleClassName = cn(
    "text-sm font-medium leading-snug",
    item.status === "completed" && "italic line-through text-muted-foreground",
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        {interactive ? (
          <Link
            href={`/protected/weekly-logs/${item.id}`}
            className={cn(titleClassName, "hover:underline")}
          >
            <HighlightedText text={item.title} query={query} />
          </Link>
        ) : (
          <span className={titleClassName}>
            <HighlightedText text={item.title} query={query} />
          </span>
        )}
        {item.comment_count > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            💬 {item.comment_count}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Avatar size="sm" className={getAvatarPreset(item.author_avatar_key).bgClass}>
          <AvatarFallback className="bg-transparent text-[10px]">
            {getAvatarPreset(item.author_avatar_key).emoji}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">
          {item.author_name ?? item.author_email ?? "알 수 없는 사용자"}
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="truncate">{item.department_name || "부서 없음"}</span>
      </div>

      <div
        className={cn(
          "flex items-center gap-1 text-xs tabular-nums",
          overdue ? "font-medium text-destructive" : "text-muted-foreground",
        )}
      >
        {overdue && <AlertTriangle className="size-3" aria-hidden />}
        <span>
          {formatDate(item.start_date)} ~ {formatDate(item.target_end_date)}
        </span>
        {overdue && <span className="font-medium">지연</span>}
      </div>

      <WeeklyLogReactionCounts up={item.reaction_up_count} down={item.reaction_down_count} />
    </div>
  );
}

export function WeeklyLogKanbanCard({
  item,
  canWrite,
  overdue,
  onMoveStatus,
  query,
}: {
  item: WeeklyLogListItem;
  canWrite: boolean;
  overdue: boolean;
  onMoveStatus: (target: WeeklyLogStatus) => void;
  query?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { status: item.status },
    disabled: !canWrite,
  });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      // 원본 카드는 드래그 중 흐리게 두고(자리 표시), 실제 이동 중인 모습은 DragOverlay가
      // 별도로 렌더링한다 — dnd-kit 권장 패턴.
      className={cn("p-3 shadow-sm transition-shadow hover:shadow-md", isDragging && "opacity-40")}
    >
      <div className="flex items-start gap-2">
        {canWrite ? (
          // 드래그 리스너는 카드 전체가 아니라 이 손잡이에만 건다 — 카드 안에 제목 링크·
          // "진행상태 이동" 버튼 등 다른 인터랙티브 요소가 있어, 카드 자체를 드래그 핸들로
          // 만들면(role="button") 인터랙티브 요소가 중첩돼 접근성 트리가 어색해진다.
          <button
            type="button"
            className="mt-0.5 shrink-0 touch-none rounded p-0.5 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing cursor-grab"
            aria-label="드래그하여 진행상태 변경"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <span
            className="mt-0.5 shrink-0 p-0.5 text-muted-foreground/30"
            title="다른 부서 업무는 진행상태를 옮길 수 없습니다"
          >
            <Lock className="size-4" aria-hidden />
            <span className="sr-only">다른 부서 업무는 진행상태를 옮길 수 없습니다</span>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <WeeklyLogKanbanCardContent item={item} overdue={overdue} query={query} />
        </div>
        {canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 shrink-0"
                aria-label="진행상태 이동"
              >
                <ArrowRightLeft className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_ORDER.filter((status) => status !== item.status).map((status) => (
                <DropdownMenuItem key={status} onSelect={() => onMoveStatus(status)}>
                  {getStatusLabel(status)}(으)로 이동
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}
