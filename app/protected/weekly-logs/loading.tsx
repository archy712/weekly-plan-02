import { WeeklyLogListSkeleton } from "@/components/weekly-log-list-skeleton";

export default function Loading() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold">주간업무일지</h1>
      <WeeklyLogListSkeleton />
    </div>
  );
}
