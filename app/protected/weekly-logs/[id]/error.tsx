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
      title="진행업무를 불러오지 못했습니다"
      onRetry={reset}
    />
  );
}
