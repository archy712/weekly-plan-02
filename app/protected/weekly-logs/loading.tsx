import { WeeklyLogListSkeleton } from "@/components/weekly-log-list-skeleton";

export default function Loading() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <WeeklyLogListSkeleton />
    </div>
  );
}
