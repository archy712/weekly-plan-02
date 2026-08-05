import type { Tables } from "@/lib/supabase/database.types";

export type UserRole = "user" | "admin";

export type Department = Tables<"departments">;

export type Profile = Omit<Tables<"profiles">, "role"> & {
  role: UserRole;
};

export type WeeklyLogStatus = "planned" | "in_progress" | "completed";

export type WeeklyLog = Omit<Tables<"weekly_logs">, "status"> & {
  status: WeeklyLogStatus;
};

export type WeeklyLogListItem = Pick<
  WeeklyLog,
  "id" | "title" | "start_date" | "target_end_date" | "status" | "department_id"
> & {
  department_name: string;
};

export type WeeklyLogAttachment = Pick<
  Tables<"weekly_log_attachments">,
  "id" | "file_name" | "file_path" | "file_size" | "content_type" | "created_at"
>;

export type WeeklyLogDetail = Pick<
  WeeklyLog,
  | "id"
  | "title"
  | "content"
  | "start_date"
  | "target_end_date"
  | "status"
  | "department_id"
  | "estimated_mm"
  | "estimated_cost"
  | "partner_company"
> & {
  department_name: string;
  author_email: string | null;
  attachments: WeeklyLogAttachment[];
};

export const ALL_DEPARTMENTS_FILTER = "all" as const;

export type DepartmentFilter = typeof ALL_DEPARTMENTS_FILTER | string;

export const ALL_STATUSES_FILTER = "all" as const;

export type StatusFilter = typeof ALL_STATUSES_FILTER | WeeklyLogStatus;

export const ALL_ROLES_FILTER = "all" as const;

export type RoleFilter = typeof ALL_ROLES_FILTER | UserRole;

// 사용자 관리 목록(관리자 화면) 한 행에 필요한 정보. profiles_department_id_fkey가
// SET NULL이라 department_id/department_name은 항상 null일 가능성을 열어둔다.
export type UserAdminListItem = {
  id: string;
  email: string;
  name: string | null;
  department_id: string | null;
  department_name: string | null;
  role: UserRole;
  avatar_key: string;
  created_at: string;
};

// 사용자 상세(관리자 화면)에서 보여주는 프로필 전체 정보.
export type UserAdminDetailData = Omit<UserAdminListItem, "department_name"> & {
  department_name: string | null;
  phone_number: string | null;
  bio: string | null;
};

// 사용자 상세 화면의 "작성한 주간업무일지 요약" — 관리자가 강등/부서 이전 판단에
// 쓰는 근거이므로 총 건수·상태별 분포·최근 5건을 함께 담는다.
export type UserAdminLogSummary = {
  totalCount: number;
  statusCounts: Record<WeeklyLogStatus, number>;
  recent: Pick<WeeklyLogListItem, "id" | "title" | "start_date" | "status">[];
};
