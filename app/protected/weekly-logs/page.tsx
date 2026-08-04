import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogListView } from "@/components/weekly-log-list-view";
import { WeeklyLogListSkeleton } from "@/components/weekly-log-list-skeleton";
import { escapeLikePattern } from "@/lib/utils";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type { Department, DepartmentFilter, WeeklyLogListItem } from "@/lib/types";

const LOGS_SELECT =
  "id, title, start_date, target_end_date, is_completed, department_id, created_at, departments(name)";

async function WeeklyLogsContent({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; q?: string }>;
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
  const { department: departmentParam, q: rawQuery } = await searchParams;
  // weekly_logs SELECT는 전 부서 공개이므로 department 파라미터는 누구나 사용할 수 있다.
  // 쓰기(등록/수정/삭제)는 RLS에서 여전히 소속 부서(또는 admin)로만 제한된다.
  // 파라미터가 없는 첫 진입 시 기본값은 admin은 전체, 일반 유저는 소속 부서로 좁힌다.
  const selectedDepartment: DepartmentFilter =
    departmentParam || (isAdmin ? ALL_DEPARTMENTS_FILTER : profile.department_id);
  const searchQuery = rawQuery?.trim() ?? "";

  let logs;

  if (searchQuery) {
    // .or()는 raw PostgREST 문법을 그대로 넘기므로 검색어에 콤마/괄호가 섞이면 필터 구조가
    // 깨질 수 있다. 대신 title/content 각각을 안전한 파라미터 바인딩(ilike)으로 따로 조회한
    // 뒤 병합한다.
    const pattern = `%${escapeLikePattern(searchQuery)}%`;

    let titleQuery = supabase.from("weekly_logs").select(LOGS_SELECT).ilike("title", pattern);
    let contentQuery = supabase.from("weekly_logs").select(LOGS_SELECT).ilike("content", pattern);

    if (selectedDepartment !== ALL_DEPARTMENTS_FILTER) {
      titleQuery = titleQuery.eq("department_id", selectedDepartment);
      contentQuery = contentQuery.eq("department_id", selectedDepartment);
    }

    const [titleResult, contentResult] = await Promise.all([titleQuery, contentQuery]);

    if (titleResult.error) throw titleResult.error;
    if (contentResult.error) throw contentResult.error;

    const merged = new Map<string, (typeof titleResult.data)[number]>();
    for (const row of [...titleResult.data, ...contentResult.data]) {
      merged.set(row.id, row);
    }
    logs = [...merged.values()].sort((a, b) => {
      if (a.start_date !== b.start_date) return a.start_date < b.start_date ? 1 : -1;
      return a.created_at < b.created_at ? 1 : -1;
    });
  } else {
    let logsQuery = supabase
      .from("weekly_logs")
      .select(LOGS_SELECT)
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (selectedDepartment !== ALL_DEPARTMENTS_FILTER) {
      logsQuery = logsQuery.eq("department_id", selectedDepartment);
    }

    const { data, error: logsError } = await logsQuery;
    if (logsError) throw logsError;
    logs = data;
  }

  const items: WeeklyLogListItem[] = logs.map((log) => ({
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
      currentSearchQuery={searchQuery}
    />
  );
}

export default function WeeklyLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; q?: string }>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <Suspense fallback={<WeeklyLogListSkeleton />}>
        <WeeklyLogsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
