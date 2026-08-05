import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type CurrentProfile = {
  id: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
};

// 세션 확인(getClaims) → profiles 조회를 한 곳에 모은 헬퍼.
// getClaims()는 JWT 로컬 디코딩이라 role 변경이 즉시 반영되지 않으므로
// 관리자 여부 판단에는 절대 claims를 쓰지 않고 항상 DB의 profiles.role을 조회한다.
export async function getCurrentProfile(): Promise<CurrentProfile> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department_id")
    .eq("id", data.claims.sub)
    .maybeSingle();

  return {
    id: data.claims.sub,
    email: data.claims.email ?? "",
    role: (profile?.role as UserRole | undefined) ?? "user",
    departmentId: profile?.department_id ?? null,
  };
}

// 부서 미설정 사용자는 /protected/profile로 보내는 기존 온보딩 게이트.
export async function requireDepartment(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();

  if (!profile.departmentId) {
    redirect("/protected/profile");
  }

  return profile;
}

// 관리자 전용 라우트 가드. 부서 게이트를 먼저 통과해야 관리자 확인으로 넘어간다.
export async function requireAdmin(): Promise<CurrentProfile> {
  const profile = await requireDepartment();

  if (profile.role !== "admin") {
    redirect("/protected/weekly-logs");
  }

  return profile;
}
