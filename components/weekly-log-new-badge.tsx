import { Badge } from "@/components/ui/badge";
import { formatKstDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// 목록(테이블·카드)에서 오늘(KST) 등록된 진행업무를 구분하는 "NEW" 배지.
// todayKst는 렌더 중 Date.now()를 읽지 않도록(하이드레이션 불일치·react-hooks/purity)
// 서버 컴포넌트가 계산해 내려준 값을 쓴다 — 칸반·"내 업무" 위젯의 todayIso와 같은 관례.
// 기준은 이관·수정 시각이 아니라 최초 등록 시각(created_at)이다.
export function WeeklyLogNewBadge({
  createdAt,
  todayKst,
  className,
}: {
  createdAt: string;
  todayKst: string;
  className?: string;
}) {
  if (formatKstDate(createdAt) !== todayKst) return null;

  return (
    <Badge
      className={cn("px-1.5 py-0 text-[10px] leading-4 font-bold tracking-wide", className)}
      title="오늘 등록된 진행업무입니다"
    >
      NEW
    </Badge>
  );
}
