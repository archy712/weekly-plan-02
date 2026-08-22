"use client";

import * as React from "react";
import Link from "next/link";
import { Home, Search, Settings } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { GallerySection } from "@/components/component-gallery/gallery-section";

export function NavigationTab() {
  return (
    <div className="flex flex-col gap-6">
      <GallerySection title="Tabs" description="탭으로 콘텐츠 전환" contentClassName="sm:grid-cols-1">
        <Tabs defaultValue="tab1" className="w-full max-w-sm">
          <TabsList>
            <TabsTrigger value="tab1">첫 번째 탭</TabsTrigger>
            <TabsTrigger value="tab2">두 번째 탭</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="text-sm text-muted-foreground">
            첫 번째 탭의 내용입니다.
          </TabsContent>
          <TabsContent value="tab2" className="text-sm text-muted-foreground">
            두 번째 탭의 내용입니다.
          </TabsContent>
        </Tabs>
      </GallerySection>

      <GallerySection
        title="Breadcrumb"
        description="현재 위치를 알려주는 경로"
        contentClassName="sm:grid-cols-1"
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">홈</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1">
                  <BreadcrumbEllipsis className="size-4" />
                  <span className="sr-only">메뉴 펼치기</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>대시보드</DropdownMenuItem>
                  <DropdownMenuItem>팀 관리</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/component-gallery">컴포넌트 갤러리</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Navigation</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </GallerySection>

      <GallerySection
        title="Navigation Menu"
        description="드롭다운형 상단 내비게이션"
        contentClassName="sm:grid-cols-1"
      >
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>제품</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[220px] gap-2 p-2">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link href="#">개요</Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link href="#">기능</Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link href="#">가격</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </GallerySection>

      <GallerySection title="Pagination" description="페이지 이동" contentClassName="sm:grid-cols-1">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </GallerySection>

      <GallerySection
        title="Sidebar"
        description="접고 펼 수 있는 앱 사이드바 (미리보기 영역으로 높이 제한)"
        contentClassName="sm:grid-cols-1"
      >
        <div className="h-72 overflow-hidden rounded-lg border">
          <SidebarProvider className="h-full min-h-0" style={{ "--sidebar-width": "12rem" } as React.CSSProperties}>
            <Sidebar collapsible="none" className="h-full">
              <SidebarContent>
                <div className="px-3 py-2 text-sm font-semibold">My App</div>
                <SidebarGroup>
                  <SidebarGroupLabel>메뉴</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <Home />
                          <span>홈</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <Search />
                          <span>검색</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <Settings />
                          <span>설정</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <SidebarInset className="min-h-0">
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                콘텐츠 영역
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </GallerySection>
    </div>
  );
}
