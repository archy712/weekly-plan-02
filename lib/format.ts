import { formatImportanceLabel, IMPORTANCE_LEVELS } from "@/lib/constants/importance";
import type { WeeklyLogImportance } from "@/lib/constants/importance";
import type {
  NotificationListItem,
  WeeklyLogChangeHistoryField,
  WeeklyLogProgressBucket,
  WeeklyLogStatus,
} from "@/lib/types";

export function formatDate(value: string | Date): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return value.slice(0, 10);
}

const STATUS_LABELS: Record<WeeklyLogStatus, string> = {
  planned: "예정",
  in_progress: "진행중",
  completed: "완료",
};

export function getStatusLabel(status: WeeklyLogStatus): string {
  return STATUS_LABELS[status];
}

// 목록 테이블·목록 카드·칸반 카드·타임라인 막대가 공유하는 진척률 표시 규칙. 한 곳만
// 바꾸면 같은 업무의 진척률이 화면마다 다르게 보이므로(지연 판정 3중 일치와 동일한 함정)
// 반드시 이 함수를 거칠 것. 규칙은 세 가지다:
//   - 완료: 실제 저장값과 무관하게 100%(끝까지 갱신하지 않고 남겨둔 값을 무시 —
//     상세 페이지 displayProgress와 동일, weekly-log-detail-view.tsx 참고)
//   - 진행중: 0%도 그대로 표시한다. 진행중인데 진척률 칸만 비어 있으면 "0%"인지
//     "표시가 누락된 것"인지 화면에서 구분할 수 없다는 피드백에 따른 규칙이며,
//     "아직 입력하지 않았다"는 사실은 상세 페이지의 빨간 안내 문구가 계속 담당한다.
//   - 예정: 0%면 숨긴다. 시작 전이라 0%인 것이 당연해 표시해도 정보가 없고, 목록 한
//     화면에 "0%"만 잔뜩 깔려 실제로 의미 있는 진행중 업무의 수치가 묻히기 때문이다.
// 숨길 때는 null을 반환하므로, 호출부는 폭이 고정된 자리(빈 span 등)를 그대로 유지할 것.
export function formatProgressLabel(
  status: WeeklyLogStatus,
  progress: number,
): string | null {
  if (status === "completed") return "100%";
  if (status === "planned" && progress === 0) return null;
  return `${progress}%`;
}

const PROGRESS_BUCKET_LABELS: Record<WeeklyLogProgressBucket, string> = {
  good: "양호",
  delayed: "지연",
  unregistered: "미등록",
};

export function getProgressBucketLabel(bucket: WeeklyLogProgressBucket): string {
  return PROGRESS_BUCKET_LABELS[bucket];
}

export function formatCurrency(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

// 부서 하드 삭제가 막혔을 때 UI(사전 비활성화)와 서버 액션(경합 상황의 23503 폴백) 양쪽에서
// 동일한 문구를 쓰도록 공유하는 포맷터.
export function formatDepartmentDeleteBlockedMessage(
  memberCount: number,
  logCount: number,
): string {
  return `${memberCount}명의 팀원과 ${logCount}건의 진행업무가 있어 삭제할 수 없습니다. 비활성화하면 신규 선택 목록에서만 숨겨집니다.`;
}

// 사용자의 소속 부서 변경 확인 다이얼로그에서 쓰는 경고 문구. weekly_logs RLS의 쓰기 조건이
// department_id = current_department_id()이므로, 부서를 바꾸면 이 사용자가 작성한 기존
// 업무일지에 대한 쓰기 권한을 잃는다는 점을 명시한다.
export function formatDepartmentChangeWarning(logCount: number): string {
  if (logCount === 0) {
    return "팀을 변경하면 앞으로 이 사용자는 이전 팀의 진행업무를 수정할 수 없습니다.";
  }
  return `이 사용자가 작성한 진행업무 ${logCount}건에 대한 쓰기 권한을 잃게 됩니다. 계속하시겠습니까?`;
}

// 댓글 작성 시각 표시용. 7일 이상 지나면 상대 시간 대신 절대 날짜(formatDate)로 전환한다.
export function formatRelativeTime(value: string): string {
  const diffSec = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diffSec < 60) return "방금 전";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return formatDate(value);
}

// 알림 드롭다운(components/notification-bell.tsx)에 표시할 문구. weekly_log_title은
// 로그가 삭제돼 CASCADE로 알림까지 함께 정리되는 것이 정상 경로(Task 034)라 이론상
// null이 되기 어렵지만, 방어적으로 폴백 문구를 둔다.
export function formatNotificationMessage(notification: NotificationListItem): string {
  const actor = notification.actor_name ?? notification.actor_email ?? "알 수 없는 사용자";
  const logTitle = notification.weekly_log_title ?? "삭제된 진행업무";
  switch (notification.type) {
    case "mention":
      return `${actor}님이 "${logTitle}"에서 회원님을 멘션했습니다.`;
    case "reply":
      return `${actor}님이 "${logTitle}"의 댓글에 답글을 남겼습니다.`;
    // 리마인더(F041)는 actor_id/weekly_log_id가 둘 다 null인 스케줄 알림이라(Task 042 결정)
    // actor/logTitle을 쓰지 않는다 — 아래 default(comment)로 흘려보내면 "알 수 없는
    // 사용자님이 삭제된 업무일지에 댓글을 남겼습니다"라는 오해의 소지가 있는 문구가 나간다.
    case "reminder":
      return "이번 주 진행업무를 아직 작성하지 않았습니다.";
    // F063 이관 알림 — 새 담당자에게만 발송된다(actor는 이관을 수행한 관리자).
    case "transfer":
      return `${actor}님이 "${logTitle}"의 담당자를 회원님으로 변경했습니다.`;
    case "comment":
    default:
      return `${actor}님이 "${logTitle}"에 댓글을 남겼습니다.`;
  }
}

const CHANGE_HISTORY_FIELD_LABELS: Record<WeeklyLogChangeHistoryField, string> = {
  status: "진행상태",
  work_type: "업무타입",
  importance: "업무 중요도",
};

export function getChangeHistoryFieldLabel(field: WeeklyLogChangeHistoryField): string {
  return CHANGE_HISTORY_FIELD_LABELS[field];
}

// 변경 이력(F043)의 old_value/new_value는 DB에 원시값(status 코드, "N" 문자열, work_type을
// ', '로 합친 문자열)으로 저장돼 있고, 화면과 동일한 한글 라벨은 렌더링 시점에 입힌다
// (라벨 문구가 나중에 바뀌어도 과거 이력이 깨지지 않도록). work_type은 이미 사람이 읽을 수
// 있는 이름이 그대로 저장돼 있어 추가 변환이 필요 없다.
export function formatChangeHistoryValue(
  field: WeeklyLogChangeHistoryField,
  value: string | null,
): string {
  if (value === null) return "없음";
  if (field === "status") {
    return getStatusLabel(value as WeeklyLogStatus);
  }
  if (field === "importance") {
    const level = Number(value);
    return (IMPORTANCE_LEVELS as readonly number[]).includes(level)
      ? formatImportanceLabel(level as WeeklyLogImportance)
      : value;
  }
  return value;
}

// 이관 이력(F063)에 등장하는 사람 표시용 — 목록의 작성자 표시(author_name ?? author_email)와
// 동일한 폴백 순서를 쓰되, 프로필이 삭제돼 on delete set null로 id까지 비워진 경우까지 덮는다.
export function formatTransferPartyName(party: {
  name: string | null;
  email: string | null;
}): string {
  return party.name ?? party.email ?? "알 수 없는 사용자";
}

// 부문장/부서장/팀장 표시용. 지정된 사람이 없으면 "-", 있는데 이름이 비어 있으면(가입 시
// 이름은 선택 입력) 이메일로 폴백한다(author_name ?? author_email 패턴과 동일).
export function formatHeadName(head: { name: string | null; email: string | null } | null): string {
  if (!head) return "-";
  return head.name ?? head.email ?? "이름 미등록";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)}${units[unitIndex]}`;
}
