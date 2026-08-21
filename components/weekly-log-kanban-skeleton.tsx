import { Skeleton } from "@/components/ui/skeleton";

const COLUMN_COUNT = 3;
const CARD_COUNT = 3;

export function WeeklyLogKanbanSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-full max-w-2xl rounded-md" />
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: COLUMN_COUNT }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="flex w-72 shrink-0 flex-col gap-3 rounded-lg border bg-muted/30 p-3"
          >
            <Skeleton className="h-6 w-24 rounded-md" />
            {Array.from({ length: CARD_COUNT }).map((_, cardIndex) => (
              <Skeleton key={cardIndex} className="h-24 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
