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
};

export const ALL_DEPARTMENTS_FILTER = "all" as const;

export type DepartmentFilter = typeof ALL_DEPARTMENTS_FILTER | string;
