import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
