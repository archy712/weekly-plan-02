"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-5 text-center">
          <h1 className="text-2xl font-bold">문제가 발생했습니다</h1>
          <p className="text-muted-foreground">
            애플리케이션을 표시하는 중 오류가 발생했습니다.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
