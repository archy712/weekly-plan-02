import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function HeroCta() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    // 헤더 타이틀과 동일한 조회로, 로그인한 사용자가 소속된 조직명을 버튼에 반영한다
    // (components/site-header-title.tsx와 동일한 조인 구조).
    const { data: profile } = await supabase
      .from("weeklyplan_profiles")
      .select("departments:weeklyplan_departments(organizations:weeklyplan_organizations(name))")
      .eq("id", data.claims.sub)
      .maybeSingle();
    const organizationName = profile?.departments?.organizations?.name;

    return (
      <Button asChild size="lg">
        <Link href="/protected">
          {organizationName ? `${organizationName} 주간업무 보러가기` : "주간업무일지 보러가기"}
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/auth/login">로그인</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/auth/sign-up">회원가입</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        주간업무일지 서비스는 로그인 후 이용하실 수 있습니다.
      </p>
    </div>
  );
}
