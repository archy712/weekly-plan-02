import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogNewForm } from "@/components/weekly-log-new-form";
import { Skeleton } from "@/components/ui/skeleton";

async function NewWeeklyLogContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id, departments:departments!profiles_department_id_fkey(organization_id)")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile?.department_id || !profile.departments) {
    redirect("/protected/profile");
  }

  // 신규 작성이라 기존 선택값이 없으므로, 작성자 부서가 속한 조직의 활성 업무 타입만
  // 노출한다(업무 타입도 부서처럼 조직 하위에 속함).
  const { data: workTypeRows, error: workTypesError } = await supabase
    .from("work_types")
    .select("name")
    .eq("organization_id", profile.departments.organization_id)
    .is("archived_at", null)
    // 노출 순서는 관리자 콘솔에서 드래그로 정한 sort_order를 따른다(같은 값이면 이름순).
    .order("sort_order")
    .order("name");

  if (workTypesError) {
    throw workTypesError;
  }

  const workTypeOptions = (workTypeRows ?? []).map((row) => ({
    name: row.name,
    archived: false,
  }));

  return (
    <WeeklyLogNewForm
      workTypeOptions={workTypeOptions}
      userId={data.claims.sub}
      nowIso={new Date().toISOString()}
    />
  );
}

export default function NewWeeklyLogPage() {
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">진행업무 작성</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-md" />}>
        <NewWeeklyLogContent />
      </Suspense>
    </div>
  );
}
