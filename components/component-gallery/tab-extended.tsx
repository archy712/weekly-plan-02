"use client";

import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ArrowUpDown, FileText, Star, UploadCloud, X } from "lucide-react";

import { TreeView } from "@/components/tree-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { HtmlEditor } from "@/components/html-editor";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { GallerySection } from "@/components/component-gallery/gallery-section";
import type { DateRange } from "react-day-picker";

const TREE_DATA = [
  {
    id: "app",
    name: "app",
    children: [
      { id: "app-page", name: "page.tsx" },
      { id: "app-layout", name: "layout.tsx" },
    ],
  },
  {
    id: "components",
    name: "components",
    children: [
      {
        id: "components-ui",
        name: "ui",
        children: [{ id: "components-ui-button", name: "button.tsx" }],
      },
      { id: "components-header", name: "header.tsx" },
    ],
  },
];

type InvoiceRow = {
  email: string;
  status: string;
  amount: number;
};

const TABLE_DATA: InvoiceRow[] = [
  { email: "kim@example.com", status: "완료", amount: 100000 },
  { email: "lee@example.com", status: "처리 중", amount: 25000 },
  { email: "park@example.com", status: "완료", amount: 480000 },
  { email: "choi@example.com", status: "실패", amount: 12000 },
  { email: "jung@example.com", status: "대기", amount: 68000 },
];

const columns: ColumnDef<InvoiceRow>[] = [
  { accessorKey: "email", header: "이메일" },
  { accessorKey: "status", header: "상태" },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        금액
        <ArrowUpDown className="size-3.5" />
      </Button>
    ),
    cell: ({ row }) => `₩${row.original.amount.toLocaleString()}`,
  },
];

function ExtendedDataTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable({
    data: TABLE_DATA,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled>
          이전
        </Button>
        <Button variant="outline" size="sm" disabled>
          다음
        </Button>
      </div>
    </div>
  );
}

const MULTI_SELECT_OPTIONS = ["React", "Next.js", "Vue", "Svelte", "Angular"];

function MultiSelectDemo() {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(["React", "Next.js"]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-9 w-full max-w-sm justify-start"
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 && (
              <span className="text-muted-foreground">프레임워크 선택...</span>
            )}
            {selected.map((item) => (
              <Badge key={item} variant="secondary" className="font-normal">
                {item}
              </Badge>
            ))}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder="검색..." />
          <CommandList>
            <CommandEmpty>결과가 없습니다.</CommandEmpty>
            <CommandGroup>
              {MULTI_SELECT_OPTIONS.map((option) => (
                <CommandItem
                  key={option}
                  onSelect={() =>
                    setSelected((prev) =>
                      prev.includes(option)
                        ? prev.filter((item) => item !== option)
                        : [...prev, option],
                    )
                  }
                >
                  <span
                    className={cn(
                      "mr-2 flex size-4 items-center justify-center rounded-sm border",
                      selected.includes(option) && "bg-primary text-primary-foreground",
                    )}
                  >
                    {selected.includes(option) && "✓"}
                  </span>
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RatingDemo() {
  const [value, setValue] = React.useState(4);

  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="평점" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star}점`}
            onClick={() => setValue(star)}
            className="text-muted-foreground"
          >
            <Star
              className={cn("size-5", star <= value && "fill-amber-400 text-amber-400")}
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">{value} / 5</span>
    </div>
  );
}

function DateRangePickerDemo() {
  const [range, setRange] = React.useState<DateRange | undefined>();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[260px] justify-start text-left font-normal">
          {range?.from ? (
            range.to ? (
              <>
                {formatDate(range.from)} ~ {formatDate(range.to)}
              </>
            ) : (
              formatDate(range.from)
            )
          ) : (
            <span className="text-muted-foreground">기간을 선택하세요</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
      </PopoverContent>
    </Popover>
  );
}

function FileDropzoneDemo() {
  const [files, setFiles] = React.useState<string[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setFiles((prev) => [...prev, ...Array.from(fileList).map((file) => file.name)]);
  };

  return (
    <div className="flex max-w-md flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-input",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">파일을 드래그하거나 클릭해서 업로드하세요</p>
        <p className="text-xs text-muted-foreground">
          react-dropzone 없이 네이티브 Drag & Drop API로 구현했습니다.
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => addFiles(event.target.files)}
      />
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((name, index) => (
            <li
              key={`${name}-${index}`}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type KanbanCardData = { id: string; title: string };
type KanbanColumnId = "todo" | "in_progress" | "done";

const KANBAN_COLUMNS: { id: KanbanColumnId; label: string }[] = [
  { id: "todo", label: "할 일" },
  { id: "in_progress", label: "진행 중" },
  { id: "done", label: "완료" },
];

const INITIAL_KANBAN: Record<KanbanColumnId, KanbanCardData[]> = {
  todo: [
    { id: "card-1", title: "로그인 페이지 디자인" },
    { id: "card-2", title: "API 명세 작성" },
  ],
  in_progress: [{ id: "card-3", title: "다크모드 버그 수정" }],
  done: [
    { id: "card-4", title: "갤러리 페이지 배포" },
    { id: "card-5", title: "코드 리뷰" },
  ],
};

function KanbanCard({ card }: { card: KanbanCardData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      className={cn(
        "w-full touch-none rounded-md border bg-card px-3 py-2 text-left text-sm shadow-xs",
        isDragging && "opacity-40",
      )}
    >
      {card.title}
    </button>
  );
}

function KanbanColumn({
  id,
  label,
  cards,
}: {
  id: KanbanColumnId;
  label: string;
  cards: KanbanCardData[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-48 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2",
        isOver && "bg-primary/10 outline-dashed outline-2 outline-primary/40",
      )}
    >
      <div className="flex items-center justify-between px-1 text-sm font-medium">
        <span>{label}</span>
        <Badge variant="secondary" className="font-normal">
          {cards.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function KanbanBoardDemo() {
  const [columns, setColumns] = React.useState(INITIAL_KANBAN);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const targetColumn = event.over?.id as KanbanColumnId | undefined;
    const cardId = event.active.id as string;
    if (!targetColumn) return;

    setColumns((prev) => {
      const sourceColumn = (Object.keys(prev) as KanbanColumnId[]).find((key) =>
        prev[key].some((card) => card.id === cardId),
      );
      if (!sourceColumn || sourceColumn === targetColumn) return prev;
      const card = prev[sourceColumn].find((item) => item.id === cardId)!;
      return {
        ...prev,
        [sourceColumn]: prev[sourceColumn].filter((item) => item.id !== cardId),
        [targetColumn]: [...prev[targetColumn], card],
      };
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn key={column.id} id={column.id} label={column.label} cards={columns[column.id]} />
        ))}
      </div>
    </DndContext>
  );
}

export function ExtendedTab() {
  const [richText, setRichText] = React.useState("<p>여기에 내용을 입력하세요.</p>");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>
          아래는 shadcn/ui 공식 갤러리에는 없지만 실무에서 자주 필요한 확장 컴포넌트를 이 프로젝트에
          맞게 직접 구현하거나 조합해 추가한 예시입니다.
        </p>
        <p>
          아래 컴포넌트는 shadcn/ui 공식 레지스트리가 아니라{" "}
          <a
            href="https://github.com/mrlightful/shadcn-tree-view"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            mrlightful/shadcn-tree-view
          </a>{" "}
          커뮤니티 레지스트리에서 shadcn CLI로 설치한 확장 컴포넌트입니다 (
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            npx shadcn add &quot;https://mrlightful.com/registry/tree-view&quot;
          </code>
          ).
        </p>
      </div>

      <GallerySection
        title="Tree View"
        description="파일 탐색기 같은 계층형 목록을 펼치고 접을 수 있는 컴포넌트"
        contentClassName="sm:grid-cols-1"
      >
        <TreeView data={TREE_DATA} expandAll className="max-w-sm" />
      </GallerySection>

      <GallerySection
        title="Data Table (TanStack Table)"
        description="정렬·페이지네이션을 지원하는 데이터 테이블. shadcn Table + @tanstack/react-table 조합으로 구현했습니다."
        contentClassName="sm:grid-cols-1"
      >
        <ExtendedDataTable />
      </GallerySection>

      <GallerySection
        title="Multi Select"
        description="여러 값을 태그로 선택하는 콤보박스. Command + Popover + Badge 조합으로 구현했습니다."
        contentClassName="sm:grid-cols-1"
      >
        <MultiSelectDemo />
      </GallerySection>

      <GallerySection title="Rating" description="별점 입력 컴포넌트" contentClassName="sm:grid-cols-1">
        <RatingDemo />
      </GallerySection>

      <GallerySection
        title="Date Range Picker"
        description="예약·통계 대시보드의 기간 필터에 자주 쓰이며, 이미 설치된 Calendar(mode=range) + Popover 조합으로 새 의존성 없이 구현했습니다."
        contentClassName="sm:grid-cols-1"
      >
        <DateRangePickerDemo />
      </GallerySection>

      <GallerySection
        title="Rich Text Editor (Tiptap)"
        description="게시글·댓글 등 서식이 필요한 입력에 필요하지만 shadcn/ui 코어에는 없습니다. @tiptap/react + @tiptap/starter-kit으로 구현했습니다."
        contentClassName="sm:grid-cols-1"
      >
        <HtmlEditor value={richText} onChange={setRichText} />
      </GallerySection>

      <GallerySection
        title="File Dropzone / Uploader"
        description="드래그 앤 드롭으로 파일을 업로드하는 영역. 별도 라이브러리 없이 네이티브 Drag & Drop API와 Attachment 컴포넌트로 구현했습니다."
        contentClassName="sm:grid-cols-1"
      >
        <FileDropzoneDemo />
      </GallerySection>

      <GallerySection
        title="Kanban Board (dnd-kit)"
        description="작업 관리형 화면에서 자주 필요하며 Card + @dnd-kit/core + @dnd-kit/sortable로 구현했습니다. 카드를 드래그해 컬럼 간 이동·정렬할 수 있습니다."
        contentClassName="sm:grid-cols-1"
      >
        <KanbanBoardDemo />
      </GallerySection>
    </div>
  );
}
