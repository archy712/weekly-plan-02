"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CommandPaletteTrigger } from "@/components/command-palette";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { cn } from "@/lib/utils";
import type { NavUser } from "@/lib/types";

type NavLink = { href: string; label: string };

export function MobileNav({
  navLinks,
  user,
}: {
  navLinks: NavLink[];
  user: NavUser;
}) {
  return (
    // 알림 벨은 Sheet를 열지 않아도 바로 보여야 하므로, 메뉴 트리거 버튼과 나란히 Sheet
    // 바깥에 둔다(Realtime 구독 자체는 header-nav.tsx의 NotificationsProvider 하나만
    // 가지며, 이 컴포넌트는 그 컨텍스트를 구독하는 표시 전용 <NotificationBell />을 씀).
    <div className="flex items-center gap-1">
      {user && (
        <>
          <CommandPaletteTrigger />
          <NotificationBell />
        </>
      )}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="메뉴 열기">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader>
            <SheetTitle>메뉴</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4">
            {navLinks.map((link) => (
              <SheetClose asChild key={link.href}>
                <Link href={link.href} className="text-sm font-medium">
                  {link.label}
                </Link>
              </SheetClose>
            ))}
            {user && (
              <SheetClose asChild>
                <Link href="/protected/profile" className="text-sm font-medium">
                  프로필
                </Link>
              </SheetClose>
            )}
          </div>
          <div className="mt-auto flex flex-col gap-3 border-t px-4 py-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar size="sm" className={getAvatarPreset(user.avatarKey).bgClass}>
                    <AvatarFallback className="bg-transparent text-xs">
                      {getAvatarPreset(user.avatarKey).emoji}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user.email}</span>
                  {(user.role === "admin" || user.role === "superadmin") && (
                    <Badge variant="secondary">
                      {user.role === "superadmin" ? "슈퍼관리자" : "관리자"}
                    </Badge>
                  )}
                </div>
                <LogoutButton />
              </>
            ) : (
              <>
                <SheetClose asChild>
                  <Link
                    href="/auth/login"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    로그인
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/auth/sign-up"
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    회원가입
                  </Link>
                </SheetClose>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
