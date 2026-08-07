import { createClient } from "@/lib/supabase/server";
import { escapeLikePattern } from "@/lib/utils";
import { ALL_DEPARTMENTS_FILTER, ALL_ROLES_FILTER } from "@/lib/types";
import type {
  Department,
  UserAdminListFilters,
  UserAdminListItem,
  UserAdminListSort,
  UserRole,
} from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

const USERS_SELECT =
  "id, email, name, department_id, role, avatar_key, created_at, departments(name)";

const VALID_ROLES: UserRole[] = ["user", "admin", "superadmin"];

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  department_id: string | null;
  role: string | null;
  avatar_key: string | null;
  created_at: string;
  departments: { name: string } | null;
};

// 관리자 콘솔 사용자 관리의 조직 범위 결정: 관리자 소속 조직의 부서만 대상으로 삼는다.
// F034 슈퍼관리자는 조직 필터 없이 전 조직의 부서를 가져와 전 조직 사용자를 다룬다. 이
// 부서 목록은 필터 드롭다운과 사용자 목록 스코프(.in(department_id, ...))를 동시에 정한다.
export async function getScopedDepartments(
  supabase: Client,
  isSuperAdmin: boolean,
  organizationId: string,
): Promise<Department[]> {
  let query = supabase
    .from("departments")
    .select("id, name, created_at, archived_at, organization_id")
    .order("name");
  if (!isSuperAdmin) {
    query = query.eq("organization_id", organizationId);
  }
  const { data } = await query;
  return data ?? [];
}

// page.tsx는 searchParams에서, 서버 액션은 클라이언트가 보낸 값에서 필터/정렬을 만든다.
// 후자는 신뢰할 수 없는 입력이므로 role을 방어적으로 정규화한다(department는 조직 스코프의
// .in(...)이 최종 방어선이라 그대로 통과시킨다).
export function normalizeUserAdminFilters(raw: {
  department?: string | null;
  role?: string | null;
  q?: string | null;
}): UserAdminListFilters {
  const role =
    raw.role && VALID_ROLES.includes(raw.role as UserRole)
      ? (raw.role as UserRole)
      : ALL_ROLES_FILTER;
  return {
    department: raw.department || ALL_DEPARTMENTS_FILTER,
    role,
    q: (raw.q ?? "").trim(),
  };
}

export function normalizeUserAdminSort(raw: {
  key?: string | null;
  direction?: string | null;
}): UserAdminListSort {
  const key =
    raw.key === "email" || raw.key === "name" || raw.key === "created_at" ? raw.key : null;
  const direction = raw.direction === "desc" ? "desc" : "asc";
  return { key, direction };
}

// range가 있으면 [offset, offset+limit) 윈도를 반환하고 다음 배치 존재 여부(hasMore)를
// limit+1건 조회로 판정한다. range가 null이면 전체를 반환한다(기존 상한을 따른다).
async function fetchUserRows(
  supabase: Client,
  departmentIds: string[],
  filters: UserAdminListFilters,
  sort: UserAdminListSort,
  range: { offset: number; limit: number } | null,
): Promise<{ rows: UserRow[]; hasMore: boolean }> {
  // 조직에 부서가 하나도 없으면 in([])로 "일치 행 없음"을 안전하게 표현한다.
  let query = supabase.from("profiles").select(USERS_SELECT).in("department_id", departmentIds);

  if (filters.department !== ALL_DEPARTMENTS_FILTER) {
    query = query.eq("department_id", filters.department);
  }
  if (filters.role !== ALL_ROLES_FILTER) {
    query = query.eq("role", filters.role);
  }
  if (filters.q) {
    // 이메일 단일 컬럼 검색이라 .or() 병합이 필요 없다. %/_/\ 이스케이프만 적용한다.
    query = query.ilike("email", `%${escapeLikePattern(filters.q)}%`);
  }

  // 기본 정렬은 이메일 오름차순. 정렬 키는 profiles의 실제 컬럼(email/name/created_at)만
  // 허용되므로 그대로 order에 넘긴다(role/department_name은 정렬 대상이 아니다).
  if (!sort.key) {
    query = query.order("email", { ascending: true });
  } else {
    query = query.order(sort.key, { ascending: sort.direction === "asc" });
  }
  // 안정 정렬 타이브레이크 — 없으면 동일 정렬값 사이에서 range 윈도가 겹치거나 건너뛸 수 있다.
  query = query.order("id", { ascending: true });

  if (range) {
    query = query.range(range.offset, range.offset + range.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as UserRow[];
  if (!range) return { rows, hasMore: false };
  const hasMore = rows.length > range.limit;
  return { rows: hasMore ? rows.slice(0, range.limit) : rows, hasMore };
}

function toUserAdminItems(rows: UserRow[]): UserAdminListItem[] {
  return rows.map((row) => ({
    id: row.id,
    email: row.email ?? "",
    name: row.name,
    department_id: row.department_id,
    department_name: row.departments?.name ?? null,
    role: (row.role as UserRole) ?? "user",
    avatar_key: row.avatar_key ?? "fox",
    created_at: row.created_at,
  }));
}

// 무한 스크롤 한 배치(초기 SSR 및 스크롤 추가 로딩 공용).
export async function fetchUsersPage(
  supabase: Client,
  departmentIds: string[],
  filters: UserAdminListFilters,
  sort: UserAdminListSort,
  offset: number,
  limit: number,
): Promise<{ items: UserAdminListItem[]; hasMore: boolean }> {
  const { rows, hasMore } = await fetchUserRows(supabase, departmentIds, filters, sort, {
    offset,
    limit,
  });
  return { items: toUserAdminItems(rows), hasMore };
}
