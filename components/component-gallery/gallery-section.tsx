import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// 컴포넌트 갤러리 각 탭 안에서 컴포넌트 몇 개를 묶어 보여주는 카드 컨테이너.
// 모든 탭 파일이 이 컴포넌트로 통일된 카드 모양(둥근 테두리 + 제목/설명 헤더)을 공유한다.
export function GallerySection({
  title,
  description,
  className,
  contentClassName,
  children,
  id,
}: {
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rounded-lg border bg-card p-6", className)}>
      <div className="mb-6 flex flex-col gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2", contentClassName)}>
        {children}
      </div>
    </section>
  );
}

// 데모 컨트롤 하나 위에 붙는 작은 굵은 라벨(스크린샷의 "Input", "Textarea" 같은 소제목) +
// 컨트롤을 세로로 묶는 래퍼.
export function DemoField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
