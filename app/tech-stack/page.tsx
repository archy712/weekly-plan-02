import { Suspense } from "react";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { TechStackView } from "@/components/tech-stack-view";
import { TECH_STACK } from "@/lib/constants/tech-stack";

export const metadata = {
  title: "기술 스택",
  description: "이 프로젝트를 구성하는 프레임워크, 라이브러리, 개발 도구를 분야별로 소개합니다.",
};

export default function TechStackPage() {
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
          <h1 className="text-2xl font-bold sm:text-3xl">기술 스택</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            이 스타터킷을 구성하는 프레임워크, 라이브러리, 개발 도구를 분야별로
            정리했습니다.
          </p>
        </div>

        <div className="mt-8">
          <TechStackView categories={TECH_STACK} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
