import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

type NavUser = {
  email: string;
  role: UserRole;
} | null;

const navLinks: { href: string; label: string }[] = [];

async function getNavUser(): Promise<NavUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    email: claims.email ?? "",
    role: (profile?.role as UserRole | undefined) ?? "user",
  };
}

export async function HeaderNav() {
  const user = await getNavUser();

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
