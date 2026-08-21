import { Suspense } from "react";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { ComponentGalleryView } from "@/components/component-gallery-view";

export const metadata = {
  title: "컴포넌트 갤러리",
  description:
    "shadcn/ui 공식 레지스트리의 모든 컴포넌트와, 실무에서 자주 쓰이는 확장 컴포넌트를 함께 모아 살펴봅니다.",
};

export default function ComponentGalleryPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <Suspense fallback={null}>
        <LandingHeader />
      </Suspense>
      <div className="w-full max-w-6xl flex-1 px-4 pb-10 pt-4 sm:pb-14 sm:pt-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          홈으로
        </Link>
        <div className="mt-8 flex flex-col gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">컴포넌트 갤러리</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            shadcn/ui 공식 레지스트리의 모든 컴포넌트와, 실무에서 자주 쓰이는 확장
            컴포넌트를 함께 모아 살펴볼 수 있습니다.
          </p>
        </div>

        <div className="mt-8">
          <ComponentGalleryView />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
