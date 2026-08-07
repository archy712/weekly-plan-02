import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getReactionCountsForLogs } from "@/lib/queries/reactions";
import { escapeLikePattern } from "@/lib/utils";
import { ALL_DEPARTMENTS_FILTER, ALL_STATUSES_FILTER } from "@/lib/types";
import type {
  WeeklyLogListFilters,
  WeeklyLogListItem,
  WeeklyLogListSort,
  WeeklyLogStatus,
} from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

const LOGS_SELECT =
  "id, title, start_date, target_end_date, status, department_id, author_id, created_at, departments(name)";

type LogRow = {
  id: string;
  title: string;
  start_date: string;
  target_end_date: string;
  status: string;
  department_id: string;
  author_id: string;
  created_at: string;
  departments: { name: string } | null;
};

const VALID_STATUSES: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

// 진행상태는 알파벳 순이 아니라 업무 흐름 순서(예정 → 진행중 → 완료)로 정렬해야 의미가
// 통한다. status는 Postgres enum이 아니라 text 컬럼이라 DB의 ORDER BY는 텍스트 순
// (completed < in_progress < planned)을 따르므로, 워크플로 오름차순은 텍스트 내림차순과
// 일치한다(buildWeeklyLogsQuery의 status 분기 참고). 검색 결과를 JS로 병합·정렬할 때도
// 이 순위표로 동일한 순서를 재현한다.
const STATUS_SORT_RANK: Record<WeeklyLogStatus, number> = {
  planned: 0,
  in_progress: 1,
  completed: 2,
};

const dateParamSchema = z.string().date();

// page.tsx는 searchParams에서, 서버 액션은 클라이언트가 보낸 값에서 필터를 만든다. 후자는
// 신뢰할 수 없는 입력이므로(weekly_logs SELECT가 전 부서 공개라 권한 상승 위험은 없지만
// 잘못된 값이 PostgREST 필터를 깨뜨리지 않도록) 상태·날짜를 방어적으로 정규화한다.
// department는 RLS로 보호되는 공개 조회라 그대로 통과시킨다.
export function normalizeWeeklyLogFilters(raw: {
  department?: string | null;
  status?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
}): WeeklyLogListFilters {
  const status =
    raw.status && VALID_STATUSES.includes(raw.status as WeeklyLogStatus)
      ? (raw.status as WeeklyLogStatus)
      : ALL_STATUSES_FILTER;

  let from = raw.from && dateParamSchema.safeParse(raw.from).success ? raw.from : undefined;
  let to = raw.to && dateParamSchema.safeParse(raw.to).success ? raw.to : undefined;
  // 뒤집힌 범위(from > to)는 에러로 취급하지 않고 교환해 항상 유효한 범위로 정규화한다.
  if (from && to && from > to) {
    [from, to] = [to, from];
  }

  return {
    department: raw.department || ALL_DEPARTMENTS_FILTER,
    status,
    q: (raw.q ?? "").trim(),
    from,
    to,
  };
}

export function normalizeWeeklyLogSort(raw: {
  key?: string | null;
  direction?: string | null;
}): WeeklyLogListSort {
  const key =
    raw.key === "title" ||
    raw.key === "start_date" ||
    raw.key === "target_end_date" ||
    raw.key === "status"
      ? raw.key
      : null;
  const direction = raw.direction === "desc" ? "desc" : "asc";
  return { key, direction };
}

// 필터 + 서버 정렬을 적용한 쿼리 빌더를 만든다. 메서드 체이닝은 모두 같은 빌더 타입을
// 반환하므로 재할당으로 조건부 필터를 붙이는 관례(app/protected/weekly-logs/page.tsx와 동일)를
// 따른다. 검색 시에는 title/content 각각에 ilike를 걸어 두 번 호출한다(.or()는 검색어의
// 콤마·괄호로 필터 구조가 깨질 수 있어 쓰지 않는다는 프로젝트 관례).
// department/status/기간 스칼라 필터를 쿼리에 적용한다. 목록 조회(buildWeeklyLogsQuery)와
// 건수 조회(countWeeklyLogs)가 반드시 동일한 필터를 쓰도록 공유한다 — 한쪽만 바뀌면 화면
// 목록과 "총 N건"이 어긋난다.
function applyScalarFilters<
  Q extends {
    eq: (column: string, value: string) => Q;
    lte: (column: string, value: string) => Q;
    gte: (column: string, value: string) => Q;
  },
>(query: Q, filters: WeeklyLogListFilters): Q {
  if (filters.department !== ALL_DEPARTMENTS_FILTER) {
    query = query.eq("department_id", filters.department);
  }
  if (filters.status !== ALL_STATUSES_FILTER) {
    query = query.eq("status", filters.status);
  }
  // 기간이 겹치는 항목만 남긴다: start_date <= to AND target_end_date >= from.
  if (filters.to) {
    query = query.lte("start_date", filters.to);
  }
  if (filters.from) {
    query = query.gte("target_end_date", filters.from);
  }
  return query;
}

function buildWeeklyLogsQuery(
  supabase: Client,
  filters: WeeklyLogListFilters,
  sort: WeeklyLogListSort,
  ilike?: { column: "title" | "content"; pattern: string },
) {
  let query = applyScalarFilters(
    supabase.from("weekly_logs").select(LOGS_SELECT),
    filters,
  );

  if (ilike) {
    query = query.ilike(ilike.column, ilike.pattern);
  }

  if (!sort.key) {
    query = query.order("start_date", { ascending: false });
  } else if (sort.key === "status") {
    // 워크플로 오름차순(예정→진행중→완료) = 텍스트 내림차순(planned>in_progress>completed).
    query = query.order("status", { ascending: sort.direction === "desc" });
  } else {
    query = query.order(sort.key, { ascending: sort.direction === "asc" });
  }
  // 안정 정렬 타이브레이크 — 없으면 동일 정렬값 사이에서 range 윈도가 겹치거나 항목을
  // 건너뛸 수 있다.
  query = query.order("created_at", { ascending: false }).order("id", { ascending: false });

  return query;
}

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// 검색 분기에서 두 쿼리(title/content) 결과를 병합한 뒤 서버 정렬과 동일한 순서를 JS로
// 재현한다(buildWeeklyLogsQuery의 order와 반드시 일치해야 한다).
function compareRows(a: LogRow, b: LogRow, sort: WeeklyLogListSort) {
  let c = 0;
  if (!sort.key) {
    c = compareText(b.start_date, a.start_date); // 시작일 내림차순
  } else {
    switch (sort.key) {
      case "title":
        c = a.title.localeCompare(b.title, "ko");
        break;
      case "start_date":
        c = compareText(a.start_date, b.start_date);
        break;
      case "target_end_date":
        c = compareText(a.target_end_date, b.target_end_date);
        break;
      case "status":
        c =
          STATUS_SORT_RANK[a.status as WeeklyLogStatus] -
          STATUS_SORT_RANK[b.status as WeeklyLogStatus];
        break;
    }
    if (sort.direction === "desc") c = -c;
  }
  if (c !== 0) return c;
  // 타이브레이크: created_at 내림차순 → id 내림차순(buildWeeklyLogsQuery와 동일).
  c = compareText(b.created_at, a.created_at);
  if (c !== 0) return c;
  return compareText(b.id, a.id);
}

// range가 있으면 [offset, offset+limit) 윈도를 반환하고, 더 있는지(hasMore)는 limit보다
// 1건 더 조회해 판정한다. range가 null이면(다운로드용) 전체를 반환한다(기존 목록 조회와
// 동일하게 Supabase 기본 max-rows 상한을 따른다).
async function fetchWeeklyLogRows(
  supabase: Client,
  filters: WeeklyLogListFilters,
  sort: WeeklyLogListSort,
  range: { offset: number; limit: number } | null,
): Promise<{ rows: LogRow[]; hasMore: boolean }> {
  if (filters.q) {
    const pattern = `%${escapeLikePattern(filters.q)}%`;
    let titleQuery = buildWeeklyLogsQuery(supabase, filters, sort, {
      column: "title",
      pattern,
    });
    let contentQuery = buildWeeklyLogsQuery(supabase, filters, sort, {
      column: "content",
      pattern,
    });
    // 두 쿼리를 각각 [0, offset+limit]로 잘라도, 같은 정렬로 캡한 두 목록의 병합 상위
    // (offset+limit)건은 실제 상위 (offset+limit)건과 일치한다(캡된 정렬 목록 병합의 성질).
    const upper = range ? range.offset + range.limit : null;
    if (upper !== null) {
      titleQuery = titleQuery.range(0, upper);
      contentQuery = contentQuery.range(0, upper);
    }
    const [titleResult, contentResult] = await Promise.all([titleQuery, contentQuery]);
    if (titleResult.error) throw titleResult.error;
    if (contentResult.error) throw contentResult.error;

    const merged = new Map<string, LogRow>();
    for (const row of [
      ...((titleResult.data ?? []) as LogRow[]),
      ...((contentResult.data ?? []) as LogRow[]),
    ]) {
      merged.set(row.id, row);
    }
    const sorted = [...merged.values()].sort((a, b) => compareRows(a, b, sort));

    if (!range) return { rows: sorted, hasMore: false };
    const hasMore = sorted.length > range.offset + range.limit;
    return { rows: sorted.slice(range.offset, range.offset + range.limit), hasMore };
  }

  let query = buildWeeklyLogsQuery(supabase, filters, sort);
  if (range) {
    // limit+1건을 조회해 다음 배치 존재 여부를 판정한다.
    query = query.range(range.offset, range.offset + range.limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as LogRow[];
  if (!range) return { rows, hasMore: false };
  const hasMore = rows.length > range.limit;
  return { rows: hasMore ? rows.slice(0, range.limit) : rows, hasMore };
}

// 목록 렌더링에 필요한 3개 2차 조회(댓글수·추천비추천·작성자 신원)를 배치로 병렬 실행해
// WeeklyLogListItem[]로 조립한다(부서 목록은 로그와 무관해 page.tsx가 별도로 조회한다).
async function hydrateWeeklyLogRows(
  supabase: Client,
  rows: LogRow[],
): Promise<WeeklyLogListItem[]> {
  const logIds = rows.map((row) => row.id);
  const authorIds = [...new Set(rows.map((row) => row.author_id))];
  const hasLogs = logIds.length > 0;

  const [commentRows, reactionCounts, identities] = await Promise.all([
    hasLogs
      ? supabase
          .from("weekly_log_comments")
          .select("weekly_log_id")
          .in("weekly_log_id", logIds)
          .is("deleted_at", null)
          .then((res) => res.data ?? [])
      : Promise.resolve([] as { weekly_log_id: string }[]),
    getReactionCountsForLogs(supabase, logIds),
    hasLogs
      ? supabase
          .rpc("get_profile_identities", { profile_ids: authorIds })
          .then((res) => res.data ?? [])
      : Promise.resolve(
          [] as { id: string; email: string; name: string | null; avatar_key: string }[],
        ),
  ]);

  const commentCounts = new Map<string, number>();
  for (const row of commentRows) {
    commentCounts.set(row.weekly_log_id, (commentCounts.get(row.weekly_log_id) ?? 0) + 1);
  }

  const identityMap = new Map<
    string,
    { email: string; name: string | null; avatar_key: string }
  >();
  for (const identity of identities) {
    identityMap.set(identity.id, identity);
  }

  return rows.map((row) => {
    const author = identityMap.get(row.author_id);
    return {
      id: row.id,
      title: row.title,
      start_date: row.start_date,
      target_end_date: row.target_end_date,
      status: row.status as WeeklyLogStatus,
      department_id: row.department_id,
      department_name: row.departments?.name ?? "",
      author_id: row.author_id,
      author_name: author?.name ?? null,
      author_email: author?.email ?? null,
      author_avatar_key: author?.avatar_key ?? "fox",
      comment_count: commentCounts.get(row.id) ?? 0,
      reaction_up_count: reactionCounts.get(row.id)?.up ?? 0,
      reaction_down_count: reactionCounts.get(row.id)?.down ?? 0,
    };
  });
}

// 무한 스크롤 한 배치(초기 SSR 및 스크롤 추가 로딩 공용). offset부터 limit건을 조회하고
// 다음 배치 존재 여부(hasMore)를 함께 반환한다.
export async function fetchWeeklyLogsPage(
  supabase: Client,
  filters: WeeklyLogListFilters,
  sort: WeeklyLogListSort,
  offset: number,
  limit: number,
): Promise<{ items: WeeklyLogListItem[]; hasMore: boolean }> {
  const { rows, hasMore } = await fetchWeeklyLogRows(supabase, filters, sort, { offset, limit });
  const items = await hydrateWeeklyLogRows(supabase, rows);
  return { items, hasMore };
}

// 현재 필터에 맞는 총 건수. 목록은 무한 스크롤로 일부만 로드되므로 화면에 "총 N건"을 표시할
// 때 쓴다. 검색어가 있으면 제목/내용 두 ilike의 id 합집합 크기가 총 건수다(.or()는 검색어의
// 콤마·괄호로 필터가 깨질 수 있어 쓰지 않는다는 관례 — 목록 조회와 동일 분기). 검색 분기는
// Supabase 기본 max-rows 상한을 따른다(fetchAllWeeklyLogsForExport와 동일한 한계).
export async function countWeeklyLogs(
  supabase: Client,
  filters: WeeklyLogListFilters,
): Promise<number> {
  if (filters.q) {
    const pattern = `%${escapeLikePattern(filters.q)}%`;
    const [titleRes, contentRes] = await Promise.all([
      applyScalarFilters(supabase.from("weekly_logs").select("id"), filters).ilike(
        "title",
        pattern,
      ),
      applyScalarFilters(supabase.from("weekly_logs").select("id"), filters).ilike(
        "content",
        pattern,
      ),
    ]);
    if (titleRes.error) throw titleRes.error;
    if (contentRes.error) throw contentRes.error;

    const ids = new Set<string>();
    for (const row of [
      ...((titleRes.data ?? []) as { id: string }[]),
      ...((contentRes.data ?? []) as { id: string }[]),
    ]) {
      ids.add(row.id);
    }
    return ids.size;
  }

  const { count, error } = await applyScalarFilters(
    supabase.from("weekly_logs").select("id", { count: "exact", head: true }),
    filters,
  );
  if (error) throw error;
  return count ?? 0;
}

// PDF/Excel 다운로드용 전체 조회. 화면의 필터·정렬 결과와 항상 일치해야 하므로 동일 헬퍼를
// range 없이 호출한다(기존 "전체 로드" 방식과 동일한 상한을 따른다).
export async function fetchAllWeeklyLogsForExport(
  supabase: Client,
  filters: WeeklyLogListFilters,
  sort: WeeklyLogListSort,
): Promise<WeeklyLogListItem[]> {
  const { rows } = await fetchWeeklyLogRows(supabase, filters, sort, null);
  return hydrateWeeklyLogRows(supabase, rows);
}
