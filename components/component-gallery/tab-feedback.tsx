"use client";

import { AlertCircle, Terminal } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { GallerySection } from "@/components/component-gallery/gallery-section";

export function FeedbackTab() {
  return (
    <div className="flex flex-col gap-6">
      <GallerySection title="Alert" description="정보 및 경고 메시지" contentClassName="sm:grid-cols-1">
        <div className="flex max-w-md flex-col gap-3">
          <Alert>
            <Terminal />
            <AlertTitle>안내</AlertTitle>
            <AlertDescription>일반적인 안내 메시지입니다.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>문제가 발생했을 때 표시되는 메시지입니다.</AlertDescription>
          </Alert>
        </div>
      </GallerySection>

      <GallerySection
        title="Progress"
        description="작업 진행률 표시"
        contentClassName="sm:grid-cols-1"
      >
        <Progress value={65} className="max-w-sm" />
      </GallerySection>

      <GallerySection
        title="Skeleton"
        description="로딩 중 자리표시자"
        contentClassName="sm:grid-cols-1"
      >
        <div className="flex max-w-sm items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </GallerySection>

      <GallerySection title="Spinner" description="로딩 스피너" contentClassName="sm:grid-cols-1">
        <div className="flex items-center gap-4">
          <Spinner />
          <Button disabled size="sm">
            <Spinner />
            불러오는 중
          </Button>
        </div>
      </GallerySection>

      <GallerySection
        title="Sonner (Toast)"
        description="화면 우측 하단 알림 토스트"
        contentClassName="sm:grid-cols-1"
      >
        <Button
          variant="outline"
          onClick={() => toast.success("저장되었습니다.")}
        >
          토스트 표시
        </Button>
      </GallerySection>
    </div>
  );
}
