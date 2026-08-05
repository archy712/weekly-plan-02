import { Skeleton } from "@/components/ui/skeleton";

// 대시보드 콘텐츠(요약 카드 4종 + 차트 4종)가 서버에서 통계 RPC를 조회하는 동안 보여줄
// 스트리밍 폴백. cacheComponents: true 하에서 searchParams를 읽는 비동기 컴포넌트는
// 반드시 Suspense로 감싸야 하므로(CLAUDE.md), app/protected/admin/dashboard/page.tsx가
// 이 스켈레톤을 fallback으로 사용한다.
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-80 w-full" />
        ))}
      </div>
    </div>
  );
}
