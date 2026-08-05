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
