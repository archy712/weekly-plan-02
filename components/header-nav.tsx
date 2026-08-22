import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CommandPaletteProvider, CommandPaletteTrigger } from "@/components/command-palette";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationBell, NotificationsProvider } from "@/components/notification-bell";
import { UserAccountMenu } from "@/components/user-account-menu";
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
  // 칸반보드는 F047(v2 Task 048)의 WeeklyLogViewSwitcher(목록/칸반/타임라인 탭)로 진입할 수
  // 있어 헤더의 고정 링크는 제거했다 — 스위처는 필터 조건을 유지한 채 전환되지만 이 고정
  // 링크는 항상 필터가 초기화된다는 차이가 있었다.
  const links: { href: string; label: string }[] = [];
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
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const desktopNav = (
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
        <div className="flex items-center gap-2">
          <CommandPaletteTrigger />
          <NotificationBell />
          <UserAccountMenu
            email={user.email}
            avatarKey={user.avatarKey}
            role={user.role}
          />
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
  );
  const mobileNav = (
    <div className="md:hidden">
      <MobileNav navLinks={user ? navLinks : []} user={user} />
    </div>
  );

  return (
    <NotificationsProvider
      userId={user?.id ?? null}
      initialUnreadCount={user?.unreadCount ?? 0}
      initialNotifications={user?.notifications ?? []}
    >
      {user ? (
        // 팔레트는 로그인 사용자에게만 필요하다(단축키 리스너·관리자 메뉴 분기가
        // 비로그인 방문자에게는 의미가 없음) — Provider 자체를 마운트하지 않는다.
        <CommandPaletteProvider isAdmin={isAdmin}>
          {desktopNav}
          {mobileNav}
        </CommandPaletteProvider>
      ) : (
        <>
          {desktopNav}
          {mobileNav}
        </>
      )}
    </NotificationsProvider>
  );
}
