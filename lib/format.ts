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
