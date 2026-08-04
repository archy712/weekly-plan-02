export function formatDate(value: string | Date): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return value.slice(0, 10);
}

export function getCompletionLabel(isCompleted: boolean): string {
  return isCompleted ? "완료" : "진행중";
}

export function formatCurrency(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}
