import { WeeklyLogDetailSkeleton } from "@/components/weekly-log-detail-skeleton";

export default function Loading() {
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col gap-6">
      <WeeklyLogDetailSkeleton />
    </div>
  );
}
