import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function HeroCta() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    return (
      <Button asChild size="lg">
        <Link href="/protected">주간업무일지 보러가기</Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild size="lg">
        <Link href="/auth/login">로그인</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/auth/sign-up">회원가입</Link>
      </Button>
    </>
  );
}
