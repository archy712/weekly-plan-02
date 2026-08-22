import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <h2 className="text-xl font-semibold">진행업무를 찾을 수 없습니다</h2>
      <p className="text-muted-foreground">
        삭제되었거나 접근 권한이 없는 항목입니다.
      </p>
      <Button asChild>
        <Link href="/protected/weekly-logs">목록으로</Link>
      </Button>
    </div>
  );
}
