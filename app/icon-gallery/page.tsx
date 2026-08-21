import { Suspense } from "react";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { IconGalleryView } from "@/components/icon-gallery-view";
import { ICON_GALLERY } from "@/lib/constants/icon-gallery";

export const metadata = {
  title: "아이콘 갤러리",
  description: "lucide-react의 모든 아이콘을 검색하고 바로 import 구문을 복사합니다.",
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
            이 프로젝트에 포함된 <span className="font-medium">lucide-react</span>의
            모든 아이콘을 검색하고 바로 import 구문을 복사할 수 있습니다.
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
