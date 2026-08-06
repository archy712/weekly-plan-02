import Link from "next/link";
import { Home } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

// 헤더 왼쪽 타이틀에 표시할 조직명을 조회한다. 로그인하지 않았거나 아직 부서(=조직)가
// 배정되지 않은 사용자는 조직을 특정할 수 없으므로 null을 반환해 제네릭 타이틀로 대체한다.
// profiles.department_id -> departments.organization_id -> organizations.name 순으로
// PostgREST 중첩 embed 한 번으로 조회한다(각 테이블 SELECT RLS가 모두 인증 사용자 공개라
// 추가 권한 처리 없이 그대로 동작).
async function getCurrentUserOrganizationName(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("departments(organizations(name))")
    .eq("id", claims.sub)
    .maybeSingle();

  return profile?.departments?.organizations?.name ?? null;
}

export async function SiteHeaderTitle() {
  const organizationName = await getCurrentUserOrganizationName();
  const title = organizationName ? `${organizationName} 주간업무` : "주간업무";

  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-bold">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Home className="size-5" />
      </span>
      {title}
    </Link>
  );
}
