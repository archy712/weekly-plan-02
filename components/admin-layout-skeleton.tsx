import { Skeleton } from "@/components/ui/skeleton";

export function AdminLayoutSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </>
  );
}
