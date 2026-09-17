import { Repeat2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// 목록(테이블·카드)에서 "이 업무는 이관된 적이 있다"를 한눈에 보여주는 배지(F063).
// 값은 weekly_logs.transfer_count 비정규화 컬럼이라 목록 조회에 추가 쿼리가 붙지 않는다
// (댓글수·반응수가 2차 조회로 병합되는 것과 다른 점). 0이면 아무것도 렌더링하지 않는다.
export function WeeklyLogTransferBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <Badge
      variant="outline"
      className={cn("gap-0.5 px-1.5 py-0 text-[10px] font-normal", className)}
      title={`담당자가 ${count}회 이관되었습니다`}
    >
      <Repeat2 className="size-3" aria-hidden />
      이관 {count}
    </Badge>
  );
}
