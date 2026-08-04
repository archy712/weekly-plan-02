import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "@/lib/format";
import type { WeeklyLogStatus } from "@/lib/types";

const STATUS_VARIANTS: Record<WeeklyLogStatus, "secondary" | "success" | "warning"> = {
  planned: "warning",
  in_progress: "success",
  completed: "secondary",
};

export function StatusBadge({ status }: { status: WeeklyLogStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{getStatusLabel(status)}</Badge>
  );
}
