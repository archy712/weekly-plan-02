import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogDetailView } from "@/components/weekly-log-detail-view";
import { WeeklyLogDetailSkeleton } from "@/components/weekly-log-detail-skeleton";
import { getWeeklyLogComments } from "@/lib/queries/comments";
import { getWeeklyLogReactionSummary } from "@/lib/queries/reactions";
import type { WeeklyLogImportance, WeeklyLogStatus, WeeklyLogWorkType } from "@/lib/types";

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
    .from("weeklyplan_profiles")
    .select("department_id, role")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile?.department_id) {
    redirect("/protected/profile");
  }

  const { data: log, error: logError } = await supabase
    .from("weeklyplan_weekly_logs")
    .select(
      "id, title, content, start_date, target_end_date, status, department_id, work_type, importance, estimated_mm, estimated_cost, partner_company, departments:weeklyplan_departments(name, organization_id), profiles:weeklyplan_profiles(email)",
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

  // 로그 존재가 확정된 뒤 필요한 4개 조회(첨부·댓글·추천비추천·업무타입)는 서로 독립적이라
  // 순차로 await하면 왕복만 늘어난다 — 한 번에 병렬로 실행한다. 넷 모두 weekly_logs SELECT
  // 공개 범위를 그대로 따르는 부서 무관 조회이고, 업무타입은 조직 필터를 SQL이 아니라 아래
  // JS에서 걸므로(전 조직 조회 후 필터) 로그 조직 id와 무관하게 미리 조회해도 안전하다.
  const [attachmentsResult, comments, reactions, workTypesResult] = await Promise.all([
    // 첨부파일도 weekly_logs와 동일하게 SELECT는 전 부서 공개다.
    supabase
      .from("weeklyplan_weekly_log_attachments")
      .select("id, file_name, file_path, file_size, content_type, created_at")
      .eq("weekly_log_id", id)
      .order("created_at", { ascending: true }),
    // 댓글도 첨부파일과 동일하게 weekly_logs SELECT 공개 범위를 그대로 따른다(부서 무관 조회).
    getWeeklyLogComments(supabase, id),
    // 추천/비추천도 부서 무관 조회(F031). 익명 집계 + 로그인 사용자의 내 반응까지 함께 받는다.
    getWeeklyLogReactionSummary(supabase, id, data.claims.sub),
    supabase.from("weeklyplan_work_types").select("name, archived_at, organization_id").order("name"),
  ]);

  if (attachmentsResult.error) {
    throw attachmentsResult.error;
  }
  if (workTypesResult.error) {
    throw workTypesResult.error;
  }

  const attachments = attachmentsResult.data;
  const workTypeRows = workTypesResult.data;

  // 부서 select의 "비활성 라벨링"과 동일한 패턴 — 이 로그의 부서가 속한 조직의 활성
  // 업무 타입은 항상 노출하고, 다른 조직 소속이거나 비활성인 타입은 이 로그에 이미
  // 선택되어 있는 경우에만(조직 재배정 등으로 어긋난 과거 값 보존) "(비활성)" 라벨로
  // 계속 노출한다.
  const logOrganizationId = log.departments?.organization_id ?? null;

  const workTypeOptions = (workTypeRows ?? [])
    .filter((row) => {
      const alreadySelected = log.work_type.includes(row.name);
      const isActiveInLogOrganization =
        !row.archived_at && row.organization_id === logOrganizationId;
      return alreadySelected || isActiveInLogOrganization;
    })
    .map((row) => ({
      name: row.name,
      archived: Boolean(row.archived_at) || row.organization_id !== logOrganizationId,
    }));

  return (
    <WeeklyLogDetailView
      log={{
        id: log.id,
        title: log.title,
        content: log.content,
        start_date: log.start_date,
        target_end_date: log.target_end_date,
        status: log.status as WeeklyLogStatus,
        department_id: log.department_id,
        work_type: log.work_type as WeeklyLogWorkType[],
        importance: log.importance as WeeklyLogImportance,
        estimated_mm: log.estimated_mm,
        estimated_cost: log.estimated_cost,
        partner_company: log.partner_company,
        department_name: log.departments?.name ?? "",
        author_email: log.profiles?.email ?? null,
        attachments: attachments ?? [],
        comments,
        reactions,
      }}
      canWrite={canWrite}
      currentUserId={data.claims.sub}
      isAdmin={profile.role === "admin"}
      workTypeOptions={workTypeOptions}
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
