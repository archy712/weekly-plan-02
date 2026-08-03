import { Badge } from "@/components/ui/badge";
import { getCompletionLabel } from "@/lib/format";

export function StatusBadge({ isCompleted }: { isCompleted: boolean }) {
  return (
    <Badge variant={isCompleted ? "success" : "secondary"}>
      {getCompletionLabel(isCompleted)}
    </Badge>
  );
}
