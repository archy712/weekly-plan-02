import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";
import { ProfileSkeleton } from "@/components/profile-skeleton";

async function ProfileContent() {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;

  const [{ data: profile, error: profileError }, { data: departments, error: departmentsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, name, department_id, phone_number, avatar_key, bio, notify_on_comment, notify_on_mention, notify_on_reminder",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("departments")
        .select("id, name, archived_at, division_id, is_direct_report")
        .order("name"),
    ]);

  if (profileError) {
    throw profileError;
  }
  if (departmentsError) {
    throw departmentsError;
  }

  // 비활성 부서는 신규 선택 목록에서 제외하되, 이미 그 부서에 속한 사용자에게는
  // 현재 값이 계속 보이도록 예외를 둔다 — 그렇지 않으면 선택지에서 사라진 값이
  // 폼 제출 시 빈 값으로 저장되는 사고로 이어질 수 있다.
  const visibleDepartments = (departments ?? []).filter(
    (department) => !department.archived_at || department.id === profile?.department_id,
  );

  return (
    <ProfileForm
      profile={
        profile ?? {
          id: userId,
          email: data.claims.email ?? null,
          name: null,
          department_id: null,
          phone_number: null,
          avatar_key: "fox",
          bio: null,
          notify_on_comment: true,
          notify_on_mention: true,
          notify_on_reminder: true,
        }
      }
      departments={visibleDepartments}
    />
  );
}

export default function ProfilePage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}
