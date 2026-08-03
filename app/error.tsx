"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/error-state";

export default function Error({
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
    <main className="flex min-h-screen flex-col items-center justify-center p-5">
      <ErrorState
        title="문제가 발생했습니다"
        description="일시적인 오류일 수 있습니다. 잠시 후 다시 시도해주세요."
        onRetry={reset}
        homeHref="/"
        homeLabel="홈으로"
      />
    </main>
  );
}
