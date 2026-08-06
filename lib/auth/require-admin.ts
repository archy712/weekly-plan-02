import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type CurrentProfile = {
  id: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  organizationId: string | null;
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
    .select("role, department_id, departments(organization_id)")
    .eq("id", data.claims.sub)
    .maybeSingle();

  return {
    id: data.claims.sub,
    email: data.claims.email ?? "",
    role: (profile?.role as UserRole | undefined) ?? "user",
    departmentId: profile?.department_id ?? null,
    organizationId: profile?.departments?.organization_id ?? null,
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

export type AdminProfile = CurrentProfile & { organizationId: string };

// 관리자 전용 라우트 가드. 부서 게이트를 먼저 통과해야 관리자 확인으로 넘어간다.
// 관리자 콘솔은 관리자 소속 조직으로 범위가 제한되므로(부서관리/사용자관리/업무타입관리/
// 조직관리/대시보드 전부), organizationId를 non-null로 보장해 호출부가 매번 null 체크를
// 반복하지 않도록 한다. department가 있으면 departments.organization_id는 NOT NULL이라
// 항상 존재해야 하지만, 혹시 모를 데이터 정합성 문제에 대비해 방어적으로 리다이렉트한다.
export async function requireAdmin(): Promise<AdminProfile> {
  const profile = await requireDepartment();

  if (profile.role !== "admin") {
    redirect("/protected/weekly-logs");
  }

  if (!profile.organizationId) {
    redirect("/protected/profile");
  }

  return { ...profile, organizationId: profile.organizationId };
}
