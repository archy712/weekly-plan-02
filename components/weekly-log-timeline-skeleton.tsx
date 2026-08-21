import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 6;

export function WeeklyLogTimelineSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-64 rounded-md" />
      <Skeleton className="h-10 w-full max-w-2xl rounded-md" />
      <div className="flex flex-col gap-1.5 rounded-lg border p-3">
        {Array.from({ length: ROW_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
