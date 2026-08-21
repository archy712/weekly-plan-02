import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// components/my-work-summary-widget.tsx의 로딩 스켈레톤. 목록과 별도의 Suspense 경계로
// 감싸므로(app/protected/weekly-logs/page.tsx) 위젯 RPC가 느려도 이 스켈레톤만 잠깐
// 보이고 목록 스트리밍은 지연되지 않는다.
export function MyWorkSummarySkeleton() {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 divide-y p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-2 px-4 py-4">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
