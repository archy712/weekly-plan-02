import { WeeklyLogTimelineSkeleton } from "@/components/weekly-log-timeline-skeleton";

// 라우트 전환 즉시 뜨는 스켈레톤(page.tsx의 Suspense fallback과 동일). loading.tsx가 있으면
// Next.js가 이 셸을 미리 프리페치해 클릭과 동시에 화면이 바뀐다 — 없으면 서버 응답을
// 기다리는 동안 이전 화면이 멈춘 것처럼 남는다.
export default function Loading() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <WeeklyLogTimelineSkeleton />
    </div>
  );
}
