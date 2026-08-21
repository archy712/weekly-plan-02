import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationBell, NotificationsProvider } from "@/components/notification-bell";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { getRecentNotifications, getUnreadNotificationCount } from "@/lib/queries/notifications";
import { createClient } from "@/lib/supabase/server";
import type { NotificationListItem, UserRole } from "@/lib/types";

type NavUser = {
  id: string;
  email: string;
  role: UserRole;
  avatarKey: string;
  unreadCount: number;
  notifications: NotificationListItem[];
} | null;

function getNavLinks(user: NavUser): { href: string; label: string }[] {
  if (!user) {
    return [];
  }
  // 칸반보드는 관리자 전용이 아니라 주간업무 목록과 동일하게 전 로그인 사용자가 볼 수
  // 있으므로, "관리자 콘솔" 조건부 push보다 앞에 무조건 넣는다(요청상 배치 순서이기도 함).
  const links: { href: string; label: string }[] = [
    { href: "/protected/weekly-logs/kanban", label: "칸반보드" },
  ];
  if (user.role === "admin" || user.role === "superadmin") {
    links.push({ href: "/protected/admin", label: "관리자 콘솔" });
  }
  return links;
}

async function getNavUser(): Promise<NavUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, avatar_key")
    .eq("id", claims.sub)
    .maybeSingle();

  // 헤더 알림 벨(Task 035)의 초기 데이터를 SSR로 내려준다 — 클라이언트 훅
  // (hooks/use-notifications.ts)은 이 값을 시드로 삼아 Realtime 증분만 얹으며,
  // 마운트 시점에 목록 전체를 다시 조회하지 않는다.
  const [unreadCount, notifications] = await Promise.all([
    getUnreadNotificationCount(supabase, claims.sub),
    getRecentNotifications(supabase, claims.sub, 10),
  ]);

  return {
    id: claims.sub,
    email: claims.email ?? "",
    role: (profile?.role as UserRole | undefined) ?? "user",
    avatarKey: profile?.avatar_key ?? "fox",
    unreadCount,
    notifications,
  };
}

export async function HeaderNav() {
  const user = await getNavUser();
  const navLinks = getNavLinks(user);

  return (
    <NotificationsProvider
      userId={user?.id ?? null}
      initialUnreadCount={user?.unreadCount ?? 0}
      initialNotifications={user?.notifications ?? []}
    >
      <div className="hidden md:flex items-center gap-4">
        {user &&
          navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium hover:underline"
            >
              {link.label}
            </Link>
          ))}
        {user ? (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="flex items-center gap-1.5">
              <Avatar size="sm" className={getAvatarPreset(user.avatarKey).bgClass}>
                <AvatarFallback className="bg-transparent text-xs">
                  {getAvatarPreset(user.avatarKey).emoji}
                </AvatarFallback>
              </Avatar>
              {user.email}
              {(user.role === "admin" || user.role === "superadmin") && (
                <Badge variant="secondary">
                  {user.role === "superadmin" ? "슈퍼관리자" : "관리자"}
                </Badge>
              )}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href="/protected/profile">프로필</Link>
            </Button>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/auth/login">로그인</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">회원가입</Link>
            </Button>
          </div>
        )}
      </div>
      <div className="md:hidden">
        <MobileNav navLinks={user ? navLinks : []} user={user} />
      </div>
    </NotificationsProvider>
  );
}
