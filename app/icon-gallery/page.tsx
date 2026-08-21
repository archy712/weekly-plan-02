import { Suspense } from "react";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { IconGalleryView } from "@/components/icon-gallery-view";
import { ICON_GALLERY } from "@/lib/constants/icon-gallery";

export const metadata = {
  title: "아이콘 갤러리",
  description: "lucide 아이콘을 카테고리별로 살펴보고 lucide.dev로 이동합니다.",
};

export default function IconGalleryPage() {
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
          <h1 className="text-2xl font-bold sm:text-3xl">아이콘 갤러리</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            이 프로젝트가 사용하는 <span className="font-medium">lucide</span>{" "}
            아이콘을 카테고리별로 모아 보여줍니다. 각 아이콘을 누르면 해당 아이콘의{" "}
            lucide.dev 페이지가 새 탭에서 열립니다.
          </p>
        </div>

        <div className="mt-8">
          <IconGalleryView categories={ICON_GALLERY} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
