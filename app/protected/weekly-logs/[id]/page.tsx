import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogDetailView } from "@/components/weekly-log-detail-view";
import { WeeklyLogDetailSkeleton } from "@/components/weekly-log-detail-skeleton";

async function WeeklyLogDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // uuid 형식이 아닌 id를 그대로 쿼리하면 Postgres가 22P02(invalid input syntax)
  // 오류를 던져 500으로 이어진다. 존재하지 않는 id와 동일하게 404로 처리한다.
  if (!z.string().uuid().safeParse(id).success) {
    notFound();
  }

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

  const { data: log, error: logError } = await supabase
    .from("weekly_logs")
    .select(
      "id, title, content, start_date, target_end_date, is_completed, department_id, estimated_mm, estimated_cost, partner_company, departments(name), profiles(email)",
    )
    .eq("id", id)
    .maybeSingle();

  if (logError) {
    throw logError;
  }

  // weekly_logs SELECT는 전 부서 공개이므로, null이면 id 자체가 존재하지 않는 경우다 — 404로 처리.
  if (!log) {
    notFound();
  }

  // 쓰기(수정/삭제/완료토글)는 RLS에서 소속 부서 또는 admin으로만 허용된다.
  const canWrite = profile.role === "admin" || log.department_id === profile.department_id;

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
        estimated_mm: log.estimated_mm,
        estimated_cost: log.estimated_cost,
        partner_company: log.partner_company,
        department_name: log.departments?.name ?? "",
        author_email: log.profiles?.email ?? null,
      }}
      canWrite={canWrite}
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
