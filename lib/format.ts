import type { WeeklyLogStatus } from "@/lib/types";

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

export function formatCurrency(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

// 부서 하드 삭제가 막혔을 때 UI(사전 비활성화)와 서버 액션(경합 상황의 23503 폴백) 양쪽에서
// 동일한 문구를 쓰도록 공유하는 포맷터.
export function formatDepartmentDeleteBlockedMessage(
  memberCount: number,
  logCount: number,
): string {
  return `${memberCount}명의 부서원과 ${logCount}건의 업무일지가 있어 삭제할 수 없습니다. 비활성화하면 신규 선택 목록에서만 숨겨집니다.`;
}

// 사용자의 소속 부서 변경 확인 다이얼로그에서 쓰는 경고 문구. weekly_logs RLS의 쓰기 조건이
// department_id = current_department_id()이므로, 부서를 바꾸면 이 사용자가 작성한 기존
// 업무일지에 대한 쓰기 권한을 잃는다는 점을 명시한다.
export function formatDepartmentChangeWarning(logCount: number): string {
  if (logCount === 0) {
    return "부서를 변경하면 앞으로 이 사용자는 이전 부서의 업무일지를 수정할 수 없습니다.";
  }
  return `이 사용자가 작성한 업무일지 ${logCount}건에 대한 쓰기 권한을 잃게 됩니다. 계속하시겠습니까?`;
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
