"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FilePlus2,
  GanttChartSquare,
  KanbanSquare,
  LayoutDashboard,
  List,
  Search,
  Tags,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type PaletteItem = { href: string; label: string; icon: LucideIcon };

const VIEW_ITEMS: PaletteItem[] = [
  { href: "/protected/weekly-logs", label: "목록", icon: List },
  { href: "/protected/weekly-logs/kanban", label: "칸반보드", icon: KanbanSquare },
  { href: "/protected/weekly-logs/timeline", label: "타임라인", icon: GanttChartSquare },
];

const WRITE_ITEMS: PaletteItem[] = [
  { href: "/protected/weekly-logs/new", label: "새 진행업무 작성", icon: FilePlus2 },
];

// 관리자 콘솔 6개 탭 전부를 등록한다 — 로드맵 Task 054는 "대시보드/부서/업무타입/사용자
// 관리"만 예시로 들었지만, 실제 관리자 콘솔(components/admin-tab-nav.tsx)은 그 사이
// "부문 관리"(organizations)·"부서 관리"(divisions)까지 6개 탭으로 이미 확장돼 있어
// 일부만 등록하면 팔레트가 실제 콘솔보다 빈약해진다.
const ADMIN_ITEMS: PaletteItem[] = [
  { href: "/protected/admin/dashboard", label: "관리자 대시보드", icon: LayoutDashboard },
  { href: "/protected/admin/organizations", label: "부문 관리", icon: Building2 },
  { href: "/protected/admin/divisions", label: "부서 관리", icon: Building2 },
  { href: "/protected/admin/departments", label: "팀 관리", icon: Users },
  { href: "/protected/admin/work-types", label: "업무타입 관리", icon: Tags },
  { href: "/protected/admin/users", label: "사용자 관리", icon: Users },
];

const PROFILE_ITEM: PaletteItem = { href: "/protected/profile", label: "프로필", icon: User };

type CommandPaletteContextValue = { openPalette: () => void };

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

function PaletteGroup({
  heading,
  items,
  onSelect,
}: {
  heading: string;
  items: PaletteItem[];
  onSelect: (href: string) => void;
}) {
  return (
    <CommandGroup heading={heading}>
      {items.map((item) => (
        <CommandItem key={item.href} value={item.label} onSelect={() => onSelect(item.href)}>
          <item.icon />
          {item.label}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

// 헤더 전역(components/header-nav.tsx)에서 로그인 사용자에게만 한 번 렌더된다. 알림 벨
// (components/notification-bell.tsx)의 Provider/Context 분리 패턴을 그대로 따라 데스크탑
// 트리거·모바일 트리거 양쪽이 같은 열림 상태를 공유하고, Dialog 자체는 이 Provider가 한 번만
// 렌더한다.
export function CommandPaletteProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      // capture 단계에서 가로채 Tiptap 에디터(components/html-editor.tsx)나 검색창의
      // 자체 키 처리로 이벤트가 전달되지 않게 한다 — stopPropagation으로 하위 리스너
      // 자체가 이벤트를 보지 못하게 막는다.
      event.preventDefault();
      event.stopPropagation();
      setOpen((prev) => !prev);
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandPaletteContext.Provider value={{ openPalette: () => setOpen(true) }}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="빠른 이동"
        description="이동할 화면을 검색하세요"
      >
        <CommandInput placeholder="이동할 화면 검색... (예: 칸반, 사용자)" />
        <CommandList>
          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
          <PaletteGroup heading="보기" items={VIEW_ITEMS} onSelect={navigate} />
          <CommandSeparator />
          <PaletteGroup heading="작성" items={WRITE_ITEMS} onSelect={navigate} />
          {isAdmin && (
            <>
              <CommandSeparator />
              <PaletteGroup heading="관리자" items={ADMIN_ITEMS} onSelect={navigate} />
            </>
          )}
          <CommandSeparator />
          <PaletteGroup heading="계정" items={[PROFILE_ITEM]} onSelect={navigate} />
        </CommandList>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}

// Provider 밖(비로그인 헤더)에서 렌더되면 조용히 아무것도 그리지 않는다
// (components/notification-bell.tsx의 NotificationBell과 동일한 방어 패턴).
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={className}
          aria-label="빠른 이동 (Ctrl+K)"
          onClick={ctx.openPalette}
        >
          <Search className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>빠른 이동 (⌘K / Ctrl K)</TooltipContent>
    </Tooltip>
  );
}
