import { cn } from "@/lib/utils";

// 진행률을 알 수 없는 비동기 작업(서버 재조회 등) 동안 표시하는 얇은 비결정형 로딩 바.
// 퍼센트를 알 수 없으므로 막대가 좌우로 훑고 지나가는 애니메이션으로 "진행 중"만 알린다.
// active가 false면 렌더링하지 않아 레이아웃 공간도 차지하지 않는다.
export function LoadingBar({ active, className }: { active: boolean; className?: string }) {
  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-busy="true"
      aria-label="불러오는 중"
      className={cn("h-0.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className="animate-[indeterminate-slide_1.1s_ease-in-out_infinite] h-full w-1/4 rounded-full bg-primary" />
    </div>
  );
}
