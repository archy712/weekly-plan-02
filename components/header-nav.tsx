import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

type NavUser = {
  email: string;
  role: UserRole;
  avatarKey: string;
} | null;

function getNavLinks(user: NavUser): { href: string; label: string }[] {
  if (!user) {
    return [];
  }
  const links: { href: string; label: string }[] = [];
  if (user.role === "admin") {
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

  return {
    email: claims.email ?? "",
    role: (profile?.role as UserRole | undefined) ?? "user",
    avatarKey: profile?.avatar_key ?? "fox",
  };
}

export async function HeaderNav() {
  const user = await getNavUser();
  const navLinks = getNavLinks(user);

  return (
    <>
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
            <span className="flex items-center gap-1.5">
              <Avatar size="sm" className={getAvatarPreset(user.avatarKey).bgClass}>
                <AvatarFallback className="bg-transparent text-xs">
                  {getAvatarPreset(user.avatarKey).emoji}
                </AvatarFallback>
              </Avatar>
              {user.email}
              {user.role === "admin" && (
                <Badge variant="secondary">관리자</Badge>
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
    </>
  );
}
