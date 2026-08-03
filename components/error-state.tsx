import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "오류가 발생했습니다",
  description = "일시적인 오류일 수 있습니다. 잠시 후 다시 시도해주세요.",
  onRetry,
  homeHref = "/protected",
  homeLabel = "홈으로",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        {onRetry && <Button onClick={onRetry}>다시 시도</Button>}
        <Button asChild variant="outline">
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
