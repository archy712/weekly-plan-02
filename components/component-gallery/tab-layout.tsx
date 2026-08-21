"use client";

import { FolderPlus, Inbox, Archive } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { GallerySection } from "@/components/component-gallery/gallery-section";

export function LayoutTab() {
  return (
    <div className="flex flex-col gap-6">
      <GallerySection title="Separator" description="구분선" contentClassName="sm:grid-cols-1">
        <div className="max-w-sm text-sm">
          <p>위 콘텐츠</p>
          <Separator className="my-3" />
          <p>아래 콘텐츠</p>
        </div>
      </GallerySection>

      <GallerySection
        title="Aspect Ratio"
        description="비율을 고정한 미디어 영역"
        contentClassName="sm:grid-cols-1"
      >
        <AspectRatio
          ratio={16 / 9}
          className="flex max-w-sm items-center justify-center rounded-md bg-muted text-sm text-muted-foreground"
        >
          16 / 9
        </AspectRatio>
      </GallerySection>

      <GallerySection
        title="Resizable"
        description="드래그로 크기를 조절하는 패널"
        contentClassName="sm:grid-cols-1"
      >
        <ResizablePanelGroup
          orientation="horizontal"
          className="max-w-md rounded-lg border"
        >
          <ResizablePanel defaultSize="50%">
            <div className="flex h-32 items-center justify-center text-sm font-medium">
              패널 1
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="50%">
            <div className="flex h-32 items-center justify-center text-sm font-medium">
              패널 2
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </GallerySection>

      <GallerySection
        title="Scroll Area"
        description="커스텀 스크롤바 영역"
        contentClassName="sm:grid-cols-1"
      >
        <ScrollArea className="h-40 max-w-sm rounded-md border p-4">
          {Array.from({ length: 15 }).map((_, index) => (
            <p key={index} className="text-sm">
              스크롤 항목 {index + 1}
            </p>
          ))}
        </ScrollArea>
      </GallerySection>

      <GallerySection
        title="Collapsible"
        description="내용을 접고 펼치기"
        contentClassName="sm:grid-cols-1"
      >
        <Collapsible className="max-w-sm">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              더 보기
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-sm text-muted-foreground">
            접혀 있다가 트리거를 누르면 펼쳐지는 영역입니다.
          </CollapsibleContent>
        </Collapsible>
      </GallerySection>

      <GallerySection
        title="Accordion"
        description="여러 섹션을 접고 펼치기"
        contentClassName="sm:grid-cols-1"
      >
        <Accordion type="single" collapsible className="max-w-sm">
          <AccordionItem value="item-1">
            <AccordionTrigger>이 스타터킷은 무엇인가요?</AccordionTrigger>
            <AccordionContent>
              Next.js App Router와 Supabase Auth를 기본 구성으로 갖춘 스타터킷입니다.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>다크모드를 지원하나요?</AccordionTrigger>
            <AccordionContent>
              next-themes 기반으로 라이트/다크/시스템 테마를 모두 지원합니다.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </GallerySection>

      <GallerySection
        title="Item"
        description="아이콘·설명이 있는 리스트 항목"
        contentClassName="sm:grid-cols-1"
      >
        <ItemGroup className="max-w-sm rounded-lg border">
          <Item>
            <ItemMedia variant="icon">
              <Inbox />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>받은 편지함</ItemTitle>
              <ItemDescription>새 메시지 3개</ItemDescription>
            </ItemContent>
          </Item>
          <ItemSeparator />
          <Item>
            <ItemMedia variant="icon">
              <Archive />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>보관함</ItemTitle>
              <ItemDescription>128개 항목</ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </GallerySection>

      <GallerySection title="Empty" description="빈 상태 안내" contentClassName="sm:grid-cols-1">
        <Empty className="max-w-sm rounded-lg border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderPlus />
            </EmptyMedia>
            <EmptyTitle>아직 데이터가 없습니다</EmptyTitle>
            <EmptyDescription>새 항목을 추가하면 여기에 표시됩니다.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">새로 만들기</Button>
          </EmptyContent>
        </Empty>
      </GallerySection>
    </div>
  );
}
