import type { Tables } from "@/lib/supabase/database.types";
import type { WeeklyLogImportance } from "@/lib/constants/importance";

// superadmin은 admin의 상위 집합이다 — is_admin() DB 함수가 admin/superadmin 모두를
// 관리자 권한으로 인정하므로, 대시보드/부서/업무타입/사용자 관리 화면은 두 역할을
// 동일하게 취급한다(여전히 자기 소속 조직으로만 범위 제한). superadmin에게만 추가로
// 열리는 것은 조직(organizations) 생성과 전 조직 범위의 수정/닫기뿐이다.
export type UserRole = "user" | "admin" | "superadmin";

export type Department = Tables<"departments">;

export type Organization = Tables<"organizations">;

export type WorkType = Tables<"work_types">;

export type Profile = Omit<Tables<"profiles">, "role"> & {
  role: UserRole;
};

export type WeeklyLogStatus = "planned" | "in_progress" | "completed";

// F031 추천/비추천. 1인 1표 토글이라 내 반응은 up/down 둘 중 하나이거나 없음(null).
export type WeeklyLogReactionKind = "up" | "down";

// 상세/목록에 노출하는 익명 집계 + 내 반응 상태. 누가 눌렀는지 명단은 공개하지 않으므로
// (F031 익명성 결정) 이 타입은 건수와 "내 반응"만 담는다. my_reaction은 로그인 사용자가
// 이 로그에 남긴 반응(없으면 null) — 버튼 강조·토글 판정에 쓴다.
export type WeeklyLogReactionSummary = {
  up: number;
  down: number;
  my_reaction: WeeklyLogReactionKind | null;
};

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
  "id" | "title" | "start_date" | "target_end_date" | "status" | "department_id" | "author_id"
> & {
  department_name: string;
  // 목록 화면의 부서 컬럼을 아바타+작성자명으로 대체하며 추가됨. profiles_select_own_or_admin
  // RLS 때문에 embed가 아니라 get_profile_identities RPC로 배치 조회한다(comments와 동일 패턴).
  author_name: string | null;
  author_email: string | null;
  author_avatar_key: string;
  comment_count: number;
  // F031 목록 노출: 댓글수 배지와 동일하게 현재 페이지 로그 id들로 2차 조회해 병합하는
  // 익명 집계(추천/비추천 건수). 목록에는 상호작용이 없어 "내 반응"은 담지 않는다.
  reaction_up_count: number;
  reaction_down_count: number;
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

// F043(v2 Task 045) 변경 이력 field 유니온 — DB CHECK 제약(weekly_log_change_history)과
// 동일하게 상세 페이지에서 즉시 저장되는 3개 속성으로 한정한다.
export type WeeklyLogChangeHistoryField = "status" | "work_type" | "importance";

export type WeeklyLogChangeHistory = Omit<Tables<"weekly_log_change_history">, "field"> & {
  field: WeeklyLogChangeHistoryField;
};

// 상세 페이지 접이식 이력 섹션에 표시할 이력 1건 — get_profile_identities RPC로 변경자
// 신원을 배치 조회해 붙인다(profiles_select_own_or_admin 때문에 embed 불가, 댓글/알림과
// 동일 패턴). changed_by가 NULL(직접 DB 접속으로 변경된 경우)이면 이름/이메일도 null이 되어
// "시스템"으로 렌더링한다.
export type WeeklyLogChangeHistoryItem = WeeklyLogChangeHistory & {
  changed_by_name: string | null;
  changed_by_email: string | null;
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
  | "work_type"
  | "importance"
  | "progress"
  | "estimated_mm"
  | "estimated_cost"
  | "partner_company"
> & {
  department_name: string;
  author_email: string | null;
  attachments: WeeklyLogAttachment[];
  comments: WeeklyLogComment[];
  // F031 상세 페이지 추천/비추천(익명 집계 + 내 반응). 상호작용이 있는 화면이라 목록과
  // 달리 my_reaction까지 포함한다.
  reactions: WeeklyLogReactionSummary;
  // F043(Task 045) 변경 이력 — 최신순, 최근 HISTORY_PAGE_SIZE(50)건까지.
  history: WeeklyLogChangeHistoryItem[];
};

export const ALL_DEPARTMENTS_FILTER = "all" as const;

export type DepartmentFilter = typeof ALL_DEPARTMENTS_FILTER | string;

export const ALL_STATUSES_FILTER = "all" as const;

export type StatusFilter = typeof ALL_STATUSES_FILTER | WeeklyLogStatus;

// 무한 스크롤(서버 증분 로딩) 한 배치의 크기. 목록 하단 센티넬이 화면에 들어오면 이만큼
// 서버에서 range로 추가 조회한다. 전통적 페이지 숫자 방식 대신 필요한 만큼만 로딩한다.
export const WEEKLY_LOGS_PAGE_SIZE = 30;

// 칸반보드 컬럼(진행상태) 1개가 최초에 로드하는 카드 수. 컬럼별로 "더 보기" 버튼으로
// 독립적으로 이어서 불러온다(전체 목록을 한 번에 불러오지 않는다).
export const WEEKLY_LOGS_KANBAN_COLUMN_PAGE_SIZE = 20;

// 타임라인 뷰(F047, v2 Task 048)는 무한 스크롤/컬럼 페이징이 아니라 지정된 기간 전체를 한
// 화면에 그리므로, 그대로 두면 데이터가 늘어날수록(현재 325건+) 가장 무거운 화면이 된다.
// 렌더 상한을 두고 초과분은 안내와 함께 절단한다(로드맵 결정).
export const WEEKLY_LOGS_TIMELINE_PAGE_SIZE = 200;

// 칸반보드 한 컬럼(진행상태 1개)의 데이터. total은 현재 필터 조건에서 이 상태에 해당하는
// 전체 건수이고 items.length는 그중 로드된 건수 — "더 보기" 버튼과 헤더 배지 표시에 쓴다.
export type WeeklyLogKanbanColumn = {
  status: WeeklyLogStatus;
  items: WeeklyLogListItem[];
  hasMore: boolean;
  total: number;
};

// 목록 정렬 키. 증분 로딩에서는 일부만 로드된 상태의 클라이언트 정렬이 어긋나므로 정렬을
// 전부 서버 ORDER BY로 처리한다 — 그래서 작성자(author_name)는 정렬 대상에서 제외한다.
// 작성자 이름은 weekly_logs 컬럼이 아니라 profiles_select_own_or_admin RLS 때문에
// get_profile_identities RPC로만 조회돼 DB에서 ORDER BY로 정렬할 수 없기 때문이다.
export type WeeklyLogSortKey = "title" | "start_date" | "target_end_date" | "status";
export type WeeklyLogSortDirection = "asc" | "desc";

// 서버 목록 조회에 필요한 확정된 필터값. page.tsx가 searchParams를 해석해 만들고,
// 무한 스크롤/다운로드 서버 액션은 클라이언트가 보낸 값을 정규화(normalizeWeeklyLogFilters)해
// 동일 헬퍼(lib/queries/weekly-logs.ts)를 재사용한다. department/status는 ALL_*_FILTER 또는
// 구체값, q는 trim된 검색어("" = 없음), from/to는 유효한 날짜 문자열 또는 undefined.
// author는 Task 040(F040)에서 신설된 축 — "내 업무" 위젯이 자기 자신의 id로 목록/칸반을
// 좁혀 이동하기 위한 용도이며, weekly_logs SELECT가 전 부서 공개이므로 department와 마찬가지로
// 값 자체에 별도 권한 검증이 필요 없다(RLS가 이미 공개 조회를 허용).
export type WeeklyLogListFilters = {
  department: DepartmentFilter;
  status: StatusFilter;
  q: string;
  from?: string;
  to?: string;
  author?: string;
};

// key가 null이면 기본 정렬(시작일 내림차순, created_at·id로 안정 정렬). 증분 로딩의 range
// 윈도가 겹치거나 누락되지 않도록 모든 정렬에 created_at·id 타이브레이크를 붙인다.
export type WeeklyLogListSort = {
  key: WeeklyLogSortKey | null;
  direction: WeeklyLogSortDirection;
};

export const ALL_ROLES_FILTER = "all" as const;

export type RoleFilter = typeof ALL_ROLES_FILTER | UserRole;

// 사용자 관리 목록 무한 스크롤(주간업무일지 목록과 동일 패턴). 한 배치 30건, 정렬은 서버
// ORDER BY로 처리한다. 역할(role)은 "슈퍼관리자→관리자→일반" 커스텀 순위라 DB ORDER BY로
// 표현할 수 없고, 소속 부서(department_name)는 to-one 임베드라 부모를 안정적으로 정렬하기
// 어려워, 둘 다 정렬 대상에서 제외한다(email/name/created_at만 서버 정렬).
export const USER_ADMIN_PAGE_SIZE = 30;
export type UserAdminSortKey = "email" | "name" | "created_at";

export type UserAdminListFilters = {
  department: DepartmentFilter;
  role: RoleFilter;
  q: string;
};

// direction은 asc/desc라 weekly_logs와 동일한 WeeklyLogSortDirection을 재사용한다.
export type UserAdminListSort = {
  key: UserAdminSortKey | null;
  direction: WeeklyLogSortDirection;
};

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

// 멘션·댓글·대댓글 발생 시 DB 트리거로만 생성되는 알림(Task 034). notifications 테이블은
// weekly_logs 등 대부분의 테이블과 달리 "전 부서 공개"가 아니라 recipient_id 기준으로만
// RLS가 걸려 있어(개인 데이터), 이 타입은 항상 "내 알림" 목록에만 쓰인다.
export type NotificationType = "mention" | "comment" | "reply" | "reminder";

export type Notification = Omit<Tables<"notifications">, "type"> & {
  type: NotificationType;
};

// 헤더 알림 드롭다운(Task 035)에 표시할 알림 1건 — notifications 원본 행에 발신자(actor)
// 신원과 대상 업무일지 제목을 덧붙인 화면 전용 타입. profiles_select_own_or_admin RLS
// 때문에 actor 신원은 embed가 아니라 get_profile_identities RPC로 배치 조회해 채운다
// (댓글 작성자 조회·목록 작성자 표시와 동일한 패턴, lib/queries/notifications.ts 참고).
export type NotificationListItem = Notification & {
  actor_name: string | null;
  actor_email: string | null;
  actor_avatar_key: string;
  weekly_log_title: string | null;
};
