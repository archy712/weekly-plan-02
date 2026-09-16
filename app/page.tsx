// 서비스 랜딩(루트 "/") 페이지 — 비로그인 사용자에게 서비스를 소개하고 로그인/회원가입으로
// 유도하며, 로그인 사용자에게는 자기 조직의 주간업무로 진입하는 CTA를 보여준다.
// proxy.ts(lib/supabase/proxy.ts)의 비로그인 리다이렉트 예외에 "/"가 포함돼 있어 인증 없이
// 접근 가능한 공개 페이지다.
//
// 이 파일 자체는 async 데이터 접근이 없는 순수 동기 Server Component이며(정적 렌더 가능),
// 쿠키(getClaims)에 의존하는 동적 부분(LandingHeader·HeroCta)만 각각 <Suspense>로 격리한다.
// next.config.ts의 cacheComponents: true 하에서 Suspense 밖의 동적 데이터 접근은 프로덕션
// 빌드를 실패시키므로(공개 정보 페이지 F036~F038과 동일 제약), 이 경계 설정은 필수다.
//
// 화면 구성은 히어로(장식 배경 + 헤드라인 + CTA + 제품 미리보기)와 주요 기능 벤토 그리드
// 두 섹션이며, 각각의 마크업은 아래 3개 컴포넌트로 분리돼 있다.
import { Suspense } from "react";

// LandingHeader/HeroCta: 쿠키 기반 세션(getClaims)을 읽는 동적 Server Component (아래 Suspense로 감쌈).
// LandingHeroBackdrop/LandingAppPreview/LandingFeatureBento: 정적 장식·목업·기능 그리드.
// SiteFooter: 공개 정보 페이지(컴포넌트/아이콘/기술 스택 갤러리)로 진입하는 공통 푸터 (정적).
import { LandingAppPreview } from "@/components/landing-app-preview";
import { LandingFeatureBento } from "@/components/landing-feature-bento";
import { LandingHeader } from "@/components/landing-header";
import { LandingHeroBackdrop } from "@/components/landing-hero-backdrop";
import { SiteFooter } from "@/components/site-footer";
import { HeroCta } from "@/components/hero-cta";
// Skeleton: HeroCta가 세션을 확인하는 동안(Suspense pending) 보여줄 버튼 자리표시자.
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  return (
    // 전체 페이지 세로 플렉스 컨테이너: 최소 화면 높이를 채워 푸터가 항상 하단에 붙게 한다.
    // overflow-x-clip: 히어로 배경(LandingHeroBackdrop)이 w-screen으로 full-bleed 되므로
    // 스크롤바 폭만큼의 가로 오버플로가 생기는 것을 막는다.
    <main className="min-h-screen flex flex-col items-center overflow-x-clip">
      <div className="flex-1 w-full flex flex-col gap-5 items-center">
        {/* 헤더 + 본문 콘텐츠 묶음(푸터 제외). 비로그인 시 LandingHeader가 null이라
            여기 간격을 크게 잡으면 화면 상단이 통째로 비어 보이므로 gap은 작게 유지한다. */}
        <div className="flex-1 w-full flex flex-col gap-6 items-center">
          {/* 헤더: 쿠키(getClaims)를 읽는 동적 컴포넌트라 Suspense로 격리(cacheComponents 제약).
              비로그인 시에는 LandingHeader가 null을 반환하므로 fallback도 null(자리 차지 안 함). */}
          <Suspense fallback={null}>
            <LandingHeader />
          </Suspense>
          {/* 본문 폭 제한 컨테이너(max-w-6xl, SiteHeader·보호 페이지 레이아웃과 동일 폭 —
              헤더와 어긋나지 않도록 반드시 함께 맞출 것). 상하 패딩은 sm 이상에서 넓어지는 반응형. */}
          <div className="w-full max-w-6xl flex flex-col gap-16 px-5 pb-16 pt-4 sm:gap-24 sm:pb-20 sm:pt-6">
            {/* ── 히어로 섹션: 배지 + 헤드라인 + CTA + 제품 미리보기 ──
                relative: 자식인 LandingHeroBackdrop이 absolute로 이 섹션 기준에 깔린다. */}
            <section className="relative flex flex-col items-center gap-6 pt-4 text-center sm:pt-8">
              <LandingHeroBackdrop />

              {/* 최신 업데이트 배지 — 서비스가 계속 개선되고 있다는 신호를 주는 장치. */}
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                v2 업데이트 · 타임라인 뷰와 필터 프리셋이 추가되었습니다
              </span>

              {/* 대표 헤드라인. <br/>로 두 줄 고정, 폰트 크기는 sm/md에서 단계적으로 확대.
                  아래에서 위로 옅어지는 그라데이션 텍스트(bg-clip-text)로 평면적인 인상을 줄인다. */}
              <h1 className="max-w-3xl text-balance break-keep bg-gradient-to-br from-foreground via-foreground to-foreground/55 bg-clip-text text-4xl font-bold leading-[1.2] tracking-tight text-transparent sm:text-5xl md:text-6xl">
                팀별 진행업무를
                {/* 모바일에서는 강제 줄바꿈을 끄고 text-balance에 맡긴다
                    (좁은 폭에서 br을 그대로 두면 "하세요"만 한 줄로 떨어진다). */}
                <br className="hidden sm:inline" />{" "}
                한 곳에서 기록하고 추적하세요
              </h1>
              <p className="max-w-2xl text-balance break-keep text-muted-foreground sm:text-lg">
                팀원은 진행업무를 빠르게 기록하고, 관리자는 전체 팀의 업무
                현황을 한 곳에서 파악할 수 있는 업무 관리 서비스입니다.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {/* CTA 버튼: HeroCta가 세션을 조회해 로그인 상태(→"진행업무 보러가기")와
                    비로그인 상태(→로그인/회원가입 버튼)를 분기. 세션 조회 중에는 fallback으로
                    버튼 크기의 Skeleton 2개를 보여줘 레이아웃 이동(CLS)을 방지한다. */}
                <Suspense
                  fallback={
                    <>
                      <Skeleton className="h-10 w-24 rounded-md" />
                      <Skeleton className="h-10 w-24 rounded-md" />
                    </>
                  }
                >
                  <HeroCta />
                </Suspense>
              </div>

              {/* 제품 미리보기(칸반 화면 목업). 히어로의 시각적 앵커 역할. */}
              <div className="mt-6 w-full sm:mt-10">
                <LandingAppPreview />
              </div>
            </section>

            {/* ── 주요 기능 섹션: 벤토 그리드 ──
                id/scroll-mt: 히어로의 "기능 둘러보기" 앵커 이동 시 제목이 잘리지 않도록 여백 확보. */}
            <section id="features" className="flex scroll-mt-24 flex-col gap-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  주요 기능
                </h2>
                <p className="max-w-xl text-muted-foreground">
                  기록부터 협업, 통계, 관리까지 — 진행업무 운영에 필요한 기능을
                  한 곳에 담았습니다.
                </p>
              </div>
              <LandingFeatureBento />
            </section>
          </div>
        </div>
        {/* 공통 푸터: 정적이므로 Suspense 불필요. 공개 정보 페이지(F036~F038)로 진입. */}
        <SiteFooter />
      </div>
    </main>
  );
}
