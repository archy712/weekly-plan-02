import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1 w-full max-w-2xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold">진행업무 작성</h1>
      <Skeleton className="h-96 w-full rounded-md" />
    </div>
  );
}
