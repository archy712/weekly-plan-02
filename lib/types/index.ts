import type { Tables } from "@/lib/supabase/database.types";
import type { WeeklyLogImportance } from "@/lib/constants/importance";

export type UserRole = "user" | "admin";

export type Department = Tables<"departments">;

export type Organization = Tables<"organizations">;

export type WorkType = Tables<"work_types">;

export type Profile = Omit<Tables<"profiles">, "role"> & {
  role: UserRole;
};

export type WeeklyLogStatus = "planned" | "in_progress" | "completed";

// 업무 타입은 관리자가 work_types 테이블에서 관리하는 동적 목록이라 컴파일 타임 리터럴
// 유니온으로 좁힐 수 없다 — 유효성은 DB 트리거(validate_weekly_log_work_type)가 최종 방어선.
export type WeeklyLogWorkType = string;
export type { WeeklyLogImportance };

// 작성/수정 폼의 업무 타입 체크박스 선택지. 부서 select의 "비활성 라벨링" 패턴과 동일하게
// 활성 항목은 항상 노출하고, 비활성 항목은 이미 선택된 로그에서만 archived: true로 표시해
// "(비활성)" 라벨을 붙인다(app/protected/weekly-logs/[id]/page.tsx, new/page.tsx 참고).
export type WorkTypeOption = { name: string; archived: boolean };

export type WeeklyLog = Omit<Tables<"weekly_logs">, "status" | "work_type" | "importance"> & {
  status: WeeklyLogStatus;
  // 다중 선택(체크박스)이라 배열로 저장한다 — 최소 1개(DB CHECK 제약 cardinality > 0).
  work_type: WeeklyLogWorkType[];
  // 슬라이더 1~5단계 — DB는 smallint라 number로 오지만 1~5로 좁힌다(CHECK 제약과 동일).
  importance: WeeklyLogImportance;
};

export type WeeklyLogListItem = Pick<
  WeeklyLog,
  "id" | "title" | "start_date" | "target_end_date" | "status" | "department_id"
> & {
  department_name: string;
  comment_count: number;
};

// Excel 다운로드는 목록 조회에 포함되지 않는 업무 속성(업무타입/중요도/예상소요기간·금액/
// 협력업체/내용)까지 필요하므로, 목록 페이로드를 무겁게 만들지 않기 위해 다운로드 시점에
// 별도 조회해 WeeklyLogListItem에 덧붙이는 확장 타입을 둔다.
export type WeeklyLogExportItem = WeeklyLogListItem &
  Pick<
    WeeklyLog,
    "work_type" | "importance" | "estimated_mm" | "estimated_cost" | "partner_company" | "content"
  >;

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
  | "work_type"
  | "importance"
  | "estimated_mm"
  | "estimated_cost"
  | "partner_company"
> & {
  department_name: string;
  author_email: string | null;
  attachments: WeeklyLogAttachment[];
  comments: WeeklyLogComment[];
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

// 멘션 배지 렌더링에 필요한 최소 신원 정보. get_profile_identities RPC로 조회한다
// (profiles RLS는 본인/관리자만 허용하므로 이 함수 없이는 타인의 email/이름을 알 수 없다).
export type WeeklyLogCommentMention = {
  id: string;
  email: string | null;
  name: string | null;
};

// 상세 페이지 댓글 목록에 필요한 정보. deleted_at이 있으면 "삭제된 댓글입니다"로
// 렌더링하되 대댓글(parent_comment_id로 참조)은 유지한다(소프트 삭제, Task 032).
export type WeeklyLogComment = Pick<
  Tables<"weekly_log_comments">,
  | "id"
  | "weekly_log_id"
  | "author_id"
  | "content"
  | "parent_comment_id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  author_email: string | null;
  author_name: string | null;
  author_avatar_key: string;
  mentions: WeeklyLogCommentMention[];
};
