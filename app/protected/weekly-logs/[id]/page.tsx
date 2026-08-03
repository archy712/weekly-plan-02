import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogDetailView } from "@/components/weekly-log-detail-view";
import { WeeklyLogDetailSkeleton } from "@/components/weekly-log-detail-skeleton";

async function WeeklyLogDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile?.department_id) {
    redirect("/protected/profile");
  }

  const { data: log, error: logError } = await supabase
    .from("weekly_logs")
    .select(
      "id, title, content, start_date, target_end_date, is_completed, department_id, departments(name), profiles(email)",
    )
    .eq("id", id)
    .maybeSingle();

  if (logError) {
    throw logError;
  }

  // RLS가 타 부서 행을 이미 걸러내므로(관리자 제외), 존재하지 않거나 접근 권한이
  // 없는 id는 동일하게 null로 돌아온다 — 두 경우 모두 404로 처리.
  if (!log) {
    notFound();
  }

  return (
    <WeeklyLogDetailView
      log={{
        id: log.id,
        title: log.title,
        content: log.content,
        start_date: log.start_date,
        target_end_date: log.target_end_date,
        is_completed: log.is_completed,
        department_id: log.department_id,
        department_name: log.departments?.name ?? "",
        author_email: log.profiles?.email ?? null,
      }}
    />
  );
}

export default function WeeklyLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex-1 w-full max-w-2xl flex flex-col gap-6">
      <Suspense fallback={<WeeklyLogDetailSkeleton />}>
        <WeeklyLogDetailContent params={params} />
      </Suspense>
    </div>
  );
}
