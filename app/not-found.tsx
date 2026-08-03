import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-5 text-center">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted-foreground">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Button asChild>
        <Link href="/">홈으로</Link>
      </Button>
    </main>
  );
}
