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
    .select("department_id, role, departments(name)")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile?.department_id) {
    redirect("/protected/profile");
  }

  const isAdmin = profile.role === "admin";
  const { department: departmentParam } = await searchParams;
  // 관리자가 아니면 department 파라미터는 서버에서 완전히 무시한다(UI 은닉만으로 방어 금지).
  const selectedDepartment: DepartmentFilter =
    isAdmin && departmentParam ? departmentParam : ALL_DEPARTMENTS_FILTER;

  let logsQuery = supabase
    .from("weekly_logs")
    .select(
      "id, title, start_date, target_end_date, is_completed, department_id, departments(name)",
    )
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (isAdmin && selectedDepartment !== ALL_DEPARTMENTS_FILTER) {
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

  let departments: Department[] = [];
  let currentDepartmentName: string | null = null;

  if (isAdmin) {
    const { data: departmentRows } = await supabase
      .from("departments")
      .select("id, name, created_at")
      .order("name");
    departments = departmentRows ?? [];
    currentDepartmentName =
      selectedDepartment === ALL_DEPARTMENTS_FILTER
        ? null
        : (departments.find((dept) => dept.id === selectedDepartment)?.name ?? null);
  } else {
    currentDepartmentName = profile.departments?.name ?? null;
  }

  return (
    <WeeklyLogListView
      items={items}
      departments={departments}
      isAdmin={isAdmin}
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
