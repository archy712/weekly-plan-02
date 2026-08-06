import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogListView } from "@/components/weekly-log-list-view";
import { WeeklyLogListSkeleton } from "@/components/weekly-log-list-skeleton";
import { escapeLikePattern } from "@/lib/utils";
import { ALL_DEPARTMENTS_FILTER, ALL_STATUSES_FILTER } from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  StatusFilter,
  WeeklyLogListItem,
  WeeklyLogStatus,
} from "@/lib/types";

const LOGS_SELECT =
  "id, title, start_date, target_end_date, status, department_id, author_id, created_at, departments(name)";

// 잘못된 형식의 from/to는 500 크래시 대신 조용히 무시한다(MVP Task 014에서 잘못된 UUID가
// 500을 유발했던 사례와 동일한 방어 관례).
const dateParamSchema = z.string().date();

type WeeklyLogsSearchParams = {
  department?: string;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
};

async function WeeklyLogsContent({
  searchParams,
}: {
  searchParams: Promise<WeeklyLogsSearchParams>;
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
  const {
    department: departmentParam,
    q: rawQuery,
    status: statusParam,
    from: fromParam,
    to: toParam,
  } = await searchParams;
  // weekly_logs SELECT는 전 부서 공개이므로 department 파라미터는 누구나 사용할 수 있다.
  // 쓰기(등록/수정/삭제)는 RLS에서 여전히 소속 부서(또는 admin)로만 제한된다.
  // 파라미터가 없는 첫 진입 시 기본값은 admin은 전체, 일반 유저는 소속 부서로 좁힌다.
  const selectedDepartment: DepartmentFilter =
    departmentParam || (isAdmin ? ALL_DEPARTMENTS_FILTER : profile.department_id);
  const searchQuery = rawQuery?.trim() ?? "";
  const VALID_STATUSES: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];
  const selectedStatus: StatusFilter =
    statusParam && VALID_STATUSES.includes(statusParam as WeeklyLogStatus)
      ? (statusParam as WeeklyLogStatus)
      : ALL_STATUSES_FILTER;

  // 형식이 올바르지 않은 값(예: ?from=abc)은 필터를 적용하지 않고 조용히 무시한다.
  let fromDate = fromParam && dateParamSchema.safeParse(fromParam).success ? fromParam : undefined;
  let toDate = toParam && dateParamSchema.safeParse(toParam).success ? toParam : undefined;
  // from > to처럼 뒤집힌 범위는 에러로 취급하지 않고 두 값을 교환해 항상 유효한 범위로
  // 정규화한다(사용자가 입력 순서를 헷갈려도 결과가 빈 목록으로 튕기지 않도록).
  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }

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

    if (selectedStatus !== ALL_STATUSES_FILTER) {
      titleQuery = titleQuery.eq("status", selectedStatus);
      contentQuery = contentQuery.eq("status", selectedStatus);
    }

    // 기간 필터는 "기간이 겹치는 항목"을 기준으로 삼는다: start_date <= to AND
    // target_end_date >= from. start_date만 비교하면 조회 기간 이전에 시작해 아직 끝나지
    // 않은 장기 과제가 결과에서 누락되므로 부적절하다고 판단했다.
    // 키워드 검색은 title/content 두 쿼리로 나뉘어 병합되므로, 한쪽에만 조건을 걸면 병합된
    // 결과가 필터를 우회하게 된다 — 반드시 양쪽 쿼리 모두에 동일하게 적용해야 한다.
    if (toDate) {
      titleQuery = titleQuery.lte("start_date", toDate);
      contentQuery = contentQuery.lte("start_date", toDate);
    }
    if (fromDate) {
      titleQuery = titleQuery.gte("target_end_date", fromDate);
      contentQuery = contentQuery.gte("target_end_date", fromDate);
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

    if (selectedStatus !== ALL_STATUSES_FILTER) {
      logsQuery = logsQuery.eq("status", selectedStatus);
    }

    // 기간이 겹치는 항목만 남긴다(위 검색 분기와 동일한 판단 기준).
    if (toDate) {
      logsQuery = logsQuery.lte("start_date", toDate);
    }
    if (fromDate) {
      logsQuery = logsQuery.gte("target_end_date", fromDate);
    }

    const { data, error: logsError } = await logsQuery;
    if (logsError) throw logsError;
    logs = data;
  }

  // 댓글수는 weekly_logs와 별개 테이블(weekly_log_comments)이라 목록 조회 select에 포함할
  // 수 없다 — 현재 페이지에 보이는 로그 id들로 별도 조회한 뒤 병합한다. 삭제된 댓글
  // (deleted_at)은 상세 화면에서도 "삭제된 댓글입니다" placeholder로만 남고 실제 내용이
  // 없으므로 집계에서 제외한다.
  const logIds = logs.map((log) => log.id);
  const commentCounts = new Map<string, number>();
  if (logIds.length > 0) {
    const { data: commentRows } = await supabase
      .from("weekly_log_comments")
      .select("weekly_log_id")
      .in("weekly_log_id", logIds)
      .is("deleted_at", null);
    for (const row of commentRows ?? []) {
      commentCounts.set(row.weekly_log_id, (commentCounts.get(row.weekly_log_id) ?? 0) + 1);
    }
  }

  // 부서 컬럼을 아바타+작성자명으로 대체하기 위해 author_id들을 get_profile_identities로
  // 배치 조회한다 — profiles_select_own_or_admin RLS 때문에 embed로는 타인의 이름/아바타를
  // 가져올 수 없다(weekly_log_comments 작성자 조회와 동일한 패턴, lib/queries/comments.ts 참고).
  const authorIds = [...new Set(logs.map((log) => log.author_id))];
  const identityMap = new Map<
    string,
    { email: string; name: string | null; avatar_key: string }
  >();
  if (authorIds.length > 0) {
    const { data: identities } = await supabase.rpc("get_profile_identities", {
      profile_ids: authorIds,
    });
    for (const identity of identities ?? []) {
      identityMap.set(identity.id, identity);
    }
  }

  const items: WeeklyLogListItem[] = logs.map((log) => {
    const author = identityMap.get(log.author_id);
    return {
      id: log.id,
      title: log.title,
      start_date: log.start_date,
      target_end_date: log.target_end_date,
      status: log.status as WeeklyLogStatus,
      department_id: log.department_id,
      department_name: log.departments?.name ?? "",
      author_id: log.author_id,
      author_name: author?.name ?? null,
      author_email: author?.email ?? null,
      author_avatar_key: author?.avatar_key ?? "fox",
      comment_count: commentCounts.get(log.id) ?? 0,
    };
  });

  const { data: departmentRows } = await supabase
    .from("departments")
    .select("id, name, created_at, archived_at, organization_id")
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
      currentStatus={selectedStatus}
      currentFrom={fromDate}
      currentTo={toDate}
    />
  );
}

export default function WeeklyLogsPage({
  searchParams,
}: {
  searchParams: Promise<WeeklyLogsSearchParams>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <Suspense fallback={<WeeklyLogListSkeleton />}>
        <WeeklyLogsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
