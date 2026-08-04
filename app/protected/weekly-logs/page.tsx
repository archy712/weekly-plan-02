import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogListView } from "@/components/weekly-log-list-view";
import { WeeklyLogListSkeleton } from "@/components/weekly-log-list-skeleton";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type { Department, DepartmentFilter, WeeklyLogListItem } from "@/lib/types";

async function WeeklyLogsContent({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id, role")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile?.department_id) {
    redirect("/protected/profile");
  }

  const isAdmin = profile.role === "admin";
  const { department: departmentParam } = await searchParams;
  // weekly_logs SELECT는 전 부서 공개이므로 department 파라미터는 누구나 사용할 수 있다.
  // 쓰기(등록/수정/삭제)는 RLS에서 여전히 소속 부서(또는 admin)로만 제한된다.
  // 파라미터가 없는 첫 진입 시 기본값은 admin은 전체, 일반 유저는 소속 부서로 좁힌다.
  const selectedDepartment: DepartmentFilter =
    departmentParam || (isAdmin ? ALL_DEPARTMENTS_FILTER : profile.department_id);

  let logsQuery = supabase
    .from("weekly_logs")
    .select(
      "id, title, start_date, target_end_date, is_completed, department_id, departments(name)",
    )
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (selectedDepartment !== ALL_DEPARTMENTS_FILTER) {
    logsQuery = logsQuery.eq("department_id", selectedDepartment);
  }

  const { data: logs, error: logsError } = await logsQuery;

  if (logsError) {
    throw logsError;
  }

  const items: WeeklyLogListItem[] = (logs ?? []).map((log) => ({
    id: log.id,
    title: log.title,
    start_date: log.start_date,
    target_end_date: log.target_end_date,
    is_completed: log.is_completed,
    department_id: log.department_id,
    department_name: log.departments?.name ?? "",
  }));

  const { data: departmentRows } = await supabase
    .from("departments")
    .select("id, name, created_at")
    .order("name");
  const departments: Department[] = departmentRows ?? [];
  const currentDepartmentName: string | null =
    selectedDepartment === ALL_DEPARTMENTS_FILTER
      ? null
      : (departments.find((dept) => dept.id === selectedDepartment)?.name ?? null);

  return (
    <WeeklyLogListView
      items={items}
      departments={departments}
      currentDepartmentId={selectedDepartment}
      currentDepartmentName={currentDepartmentName}
    />
  );
}

export default function WeeklyLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold">주간업무일지</h1>
      <Suspense fallback={<WeeklyLogListSkeleton />}>
        <WeeklyLogsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
