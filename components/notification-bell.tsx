"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { Bell, CalendarClock } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { useNotifications } from "@/hooks/use-notifications";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { formatNotificationMessage, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationListItem } from "@/lib/types";

type NotificationsContextValue = {
  notifications: NotificationListItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// 데스크탑(header-nav.tsx)·모바일(mobile-nav.tsx) 양쪽에 <NotificationBell />을 각각
// 렌더링하면서도 Realtime 구독은 단 하나만 유지하기 위한 Provider. useNotifications()
// 훅(구독·상태)을 여기서 한 번만 호출하고, 두 위치의 <NotificationBell />은 이 컨텍스트를
// 구독만 한다 — 채널을 두 배로 열지 않기 위한 의도적 설계(로드맵과 다르게 처리한 부분,
// docs/ROADMAP_v1.md Task 035 참고).
export function NotificationsProvider({
  userId,
  initialUnreadCount,
  initialNotifications,
  children,
}: {
  userId: string | null;
  initialUnreadCount: number;
  initialNotifications: NotificationListItem[];
  children: ReactNode;
}) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications({
    userId,
    initialNotifications,
    initialUnreadCount,
  });

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

// 리마인더(F041) 알림은 weekly_log_id가 없다("아직 없는 로그"에 대한 알림) — 이 경우
// 작성 화면으로 보낸다(Task 042 결정).
function notificationHref(notification: NotificationListItem): string {
  if (!notification.weekly_log_id) {
    return "/protected/weekly-logs/new";
  }
  return notification.comment_id
    ? `/protected/weekly-logs/${notification.weekly_log_id}#comment-${notification.comment_id}`
    : `/protected/weekly-logs/${notification.weekly_log_id}`;
}

// 로그인한 사용자에게만 렌더한다(호출부인 header-nav.tsx/mobile-nav.tsx가 avatar·프로필
// 버튼과 동일하게 `{user && <NotificationBell />}`로 감싸는 관례를 따름). Provider 밖에서
// 실수로 렌더된 경우(ctx === null)에도 조용히 아무것도 그리지 않는다.
export function NotificationBell() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) return null;

  const { notifications, unreadCount, markRead, markAllRead } = ctx;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `알림 ${unreadCount}건` : "알림"}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-0 px-1 text-[10px] leading-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">알림</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            disabled={unreadCount === 0}
            onClick={() => markAllRead()}
          >
            모두 읽음
          </Button>
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-2">
            <EmptyState title="알림이 없습니다" />
          </div>
        ) : (
          <div className="flex max-h-96 flex-col overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} asChild className="cursor-pointer whitespace-normal p-0">
                <Link
                  href={notificationHref(notification)}
                  onClick={() => {
                    if (!notification.read_at) {
                      markRead(notification.id);
                    }
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 px-2 py-2",
                    !notification.read_at && "bg-accent/60",
                  )}
                >
                  {notification.type === "reminder" ? (
                    // 리마인더는 행위자가 없는 스케줄 알림(Task 042 결정)이라, 임의의 프리셋
                    // 아바타(fox 폴백)를 사람처럼 보여주는 대신 명확한 시스템 아이콘을 쓴다.
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      aria-hidden="true"
                    >
                      <CalendarClock className="size-3.5" />
                    </span>
                  ) : (
                    <Avatar size="sm" className={getAvatarPreset(notification.actor_avatar_key).bgClass}>
                      <AvatarFallback className="bg-transparent text-xs">
                        {getAvatarPreset(notification.actor_avatar_key).emoji}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{formatNotificationMessage(notification)}</p>
                    {/* formatRelativeTime()의 SSR/CSR 시간차로 인한 잠재적 텍스트 불일치 —
                        weekly-log-comment-section.tsx와 동일한 이유로 suppressHydrationWarning. */}
                    <p className="mt-0.5 text-xs text-muted-foreground" suppressHydrationWarning>
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read_at && (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
