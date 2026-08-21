"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "@/components/logout-button";
import { getAvatarPreset } from "@/lib/constants/avatars";
import type { UserRole } from "@/lib/types";

// 데스크탑 헤더의 신원 표시(아바타+이메일+역할 배지)·프로필 링크·로그아웃 버튼을 아바타
// 트리거 하나의 드롭다운으로 묶는다 — 이전에는 이 3가지가 서로 다른 스타일(순수 텍스트,
// outline 버튼, solid 버튼)로 나란히 나열돼 산만해 보였다(사용자 피드백). 모바일은 이미
// Sheet(MobileNav)로 그룹화돼 있어 영향 없음.
export function UserAccountMenu({
  email,
  avatarKey,
  role,
}: {
  email: string;
  avatarKey: string;
  role: UserRole;
}) {
  const preset = getAvatarPreset(avatarKey);
  const roleLabel =
    role === "superadmin" ? "슈퍼관리자" : role === "admin" ? "관리자" : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar size="sm" className={preset.bgClass}>
          <AvatarFallback className="bg-transparent text-xs">
            {preset.emoji}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-40 truncate">{email}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1.5 font-normal">
          <span className="truncate text-sm font-medium">{email}</span>
          {roleLabel && (
            <Badge variant="secondary" className="w-fit">
              {roleLabel}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/protected/profile">프로필</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <LogoutButton variant="menu-item" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
