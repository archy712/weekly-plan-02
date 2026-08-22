import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";

export function EmptyState({
  title = "표시할 항목이 없습니다",
  description,
  action,
  icon: Icon = FileText,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-16 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
