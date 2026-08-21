"use client";

import { Calendar, CreditCard, FileText, Search, Settings, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { GallerySection } from "@/components/component-gallery/gallery-section";

export function OverlaysMenusTab() {
  return (
    <div className="flex flex-col gap-6">
      <GallerySection title="Dialog" description="모달 대화상자" contentClassName="sm:grid-cols-1">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">다이얼로그 열기</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>프로필 수정</DialogTitle>
              <DialogDescription>변경 사항은 저장 버튼을 눌러야 반영됩니다.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </GallerySection>

      <GallerySection
        title="Alert Dialog"
        description="파괴적인 작업 확인"
        contentClassName="sm:grid-cols-1"
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">계정 삭제</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                이 작업은 되돌릴 수 없습니다. 계정과 관련된 모든 데이터가 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </GallerySection>

      <GallerySection
        title="Sheet"
        description="화면 가장자리에서 밀려나오는 패널"
        contentClassName="sm:grid-cols-1"
      >
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">시트 열기</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>설정</SheetTitle>
              <SheetDescription>화면 가장자리에서 슬라이드로 열리는 패널입니다.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </GallerySection>

      <GallerySection
        title="Drawer"
        description="모바일 친화적 하단 패널 (vaul)"
        contentClassName="sm:grid-cols-1"
      >
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline">드로어 열기</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>알림 설정</DrawerTitle>
              <DrawerDescription>하단에서 올라오는 패널입니다.</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">닫기</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </GallerySection>

      <GallerySection
        title="Popover / Hover Card"
        description="가벼운 부가 정보 표시"
        contentClassName="sm:grid-cols-1"
      >
        <div className="flex flex-wrap gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Popover 열기</Button>
            </PopoverTrigger>
            <PopoverContent className="text-sm">
              가벼운 부가 정보를 담는 팝오버입니다.
            </PopoverContent>
          </Popover>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link">@shadcn</Button>
            </HoverCardTrigger>
            <HoverCardContent className="text-sm">
              <p className="font-medium">shadcn</p>
              <p className="text-muted-foreground">UI 컴포넌트 라이브러리 제작자</p>
            </HoverCardContent>
          </HoverCard>
        </div>
      </GallerySection>

      <GallerySection
        title="Tooltip"
        description="마우스 오버 시 안내 문구"
        contentClassName="sm:grid-cols-1"
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">마우스를 올려보세요</Button>
            </TooltipTrigger>
            <TooltipContent>간단한 안내 문구</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </GallerySection>

      <GallerySection
        title="Dropdown Menu / Context Menu"
        description="클릭·우클릭 메뉴"
        contentClassName="sm:grid-cols-1"
      >
        <div className="flex flex-wrap items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">메뉴 열기</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>수정</DropdownMenuItem>
              <DropdownMenuItem>복제</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ContextMenu>
            <ContextMenuTrigger className="flex h-9 w-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              여기를 우클릭
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>복사</ContextMenuItem>
              <ContextMenuItem>붙여넣기</ContextMenuItem>
              <ContextMenuItem variant="destructive">삭제</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </GallerySection>

      <GallerySection
        title="Menubar"
        description="데스크톱 앱 스타일 메뉴바"
        contentClassName="sm:grid-cols-1"
      >
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>파일</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                새로 만들기 <MenubarShortcut>⌘N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                열기 <MenubarShortcut>⌘O</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem>
                저장 <MenubarShortcut>⌘S</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>편집</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                실행 취소 <MenubarShortcut>⌘Z</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                다시 실행 <MenubarShortcut>⇧⌘Z</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </GallerySection>

      <GallerySection
        title="Command"
        description="⌘K 스타일 커맨드 팔레트"
        contentClassName="sm:grid-cols-1"
      >
        <Command className="max-w-md rounded-lg border shadow-sm">
          <CommandInput placeholder="명령어를 검색하세요..." />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            <CommandGroup heading="제안">
              <CommandItem>
                <FileText />
                <span>새 문서</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <Search />
                <span>검색</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="설정">
              <CommandItem>
                <User />
                <span>프로필</span>
              </CommandItem>
              <CommandItem>
                <CreditCard />
                <span>결제</span>
              </CommandItem>
              <CommandItem>
                <Settings />
                <span>환경설정</span>
              </CommandItem>
              <CommandItem>
                <Calendar />
                <span>일정</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </GallerySection>
    </div>
  );
}
