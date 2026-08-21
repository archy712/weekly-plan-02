"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

// variant="menu-item"은 components/user-account-menu.tsx의 계정 드롭다운 안에서 쓰인다 —
// 로그아웃 로직(supabase.auth.signOut() + 하드 네비게이션)은 하나로 유지하고 렌더링만 분기한다.
export function LogoutButton({
  variant = "button",
}: {
  variant?: "button" | "menu-item";
}) {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // 로그인 화면과 동일하게 하드 네비게이션으로 이동한다 — 클라이언트 라우터 캐시를 우회해
    // 로그인 폼을 완전히 새로 렌더링해야 브라우저의 비밀번호 자동완성이 안정적으로 동작한다.
    window.location.href = "/auth/login";
  };

  if (variant === "menu-item") {
    return <DropdownMenuItem onSelect={logout}>로그아웃</DropdownMenuItem>;
  }

  return <Button onClick={logout}>로그아웃</Button>;
}
