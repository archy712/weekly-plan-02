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
    <ErrorState
      title="관리자 콘솔을 불러오지 못했습니다"
      onRetry={reset}
    />
  );
}
