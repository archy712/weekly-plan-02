import { Suspense } from "react";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { ComponentGalleryView } from "@/components/component-gallery-view";
import { COMPONENT_GALLERY } from "@/lib/constants/component-gallery";

export const metadata = {
  title: "컴포넌트 갤러리",
  description:
    "shadcn/ui 컴포넌트를 카테고리별로 살펴보고 Base UI 문서로 이동합니다.",
};

export default function ComponentGalleryPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <Suspense fallback={null}>
        <LandingHeader />
      </Suspense>
      <div className="w-full max-w-5xl flex-1 px-4 pb-10 pt-4 sm:pb-14 sm:pt-6">
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
            shadcn/ui 컴포넌트를 카테고리별로 모아 보여줍니다. 각 카드를 누르면
            해당 컴포넌트의 <span className="font-medium">Base UI</span> 타입 공식
            문서가 새 탭에서 열립니다.
          </p>
        </div>

        <div className="mt-8">
          <ComponentGalleryView categories={COMPONENT_GALLERY} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
