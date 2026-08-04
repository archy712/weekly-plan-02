"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // 로그인 화면과 동일하게 하드 네비게이션으로 이동한다 — 클라이언트 라우터 캐시를 우회해
    // 로그인 폼을 완전히 새로 렌더링해야 브라우저의 비밀번호 자동완성이 안정적으로 동작한다.
    window.location.href = "/auth/login";
  };

  return <Button onClick={logout}>로그아웃</Button>;
}
