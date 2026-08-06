import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

// 랜딩 페이지 전용 — 로그인 전에는 헤더 자체를 노출하지 않는다(로그인/회원가입 CTA가
// 히어로 섹션에 이미 있어 헤더의 로그인 버튼과 중복되므로 비로그인 상태에서는 생략).
// 로그인한 사용자가 "/"로 돌아왔을 때는 프로필·로그아웃 등 상시 내비게이션이 필요해
// 기존처럼 SiteHeader를 그대로 노출한다. env var 미설정 상태(hasEnvVars=false)는 인증
// 조회 자체가 불가능하므로 항상 헤더(EnvVarWarning 노출용)를 보여준다.
export async function LandingHeader() {
  if (!hasEnvVars) {
    return <SiteHeader />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return null;
  }

  return <SiteHeader />;
}
