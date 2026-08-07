import { Suspense } from "react";
import {
  Bell,
  Building2,
  FileDown,
  FileText,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Paperclip,
  ShieldCheck,
} from "lucide-react";

import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroCta } from "@/components/hero-cta";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const features = [
  {
    icon: FileText,
    title: "리치 텍스트 업무일지",
    description:
      "서식 편집기로 주간 업무 내용을 작성하고, 시작일·목표종료일·진행 상태까지 한 화면에서 체계적으로 기록하세요.",
  },
  {
    icon: Building2,
    title: "조직·부서 계층 관리",
    description:
      "조직 아래 부서를 두는 계층 구조로, 소속 부서는 물론 관리자는 부서 필터로 전체 조직의 현황을 한눈에 파악합니다.",
  },
  {
    icon: ListChecks,
    title: "업무 타입·중요도 분류",
    description:
      "업무 타입(다중 선택)과 1~5단계 중요도로 업무를 분류해 우선순위와 성격을 명확하게 관리하세요.",
  },
  {
    icon: FileDown,
    title: "PDF·Excel 다운로드",
    description:
      "조회 중인 업무 목록을 한글 서식이 유지되는 PDF나 Excel(.xlsx)로 내려받아 보고 자료로 바로 활용하세요.",
  },
  {
    icon: LayoutDashboard,
    title: "통계 대시보드",
    description:
      "부서별·기간별·상태별·업무타입별·중요도별 집계를 차트로 시각화해 팀 현황을 데이터로 파악합니다.",
  },
  {
    icon: ShieldCheck,
    title: "관리자 콘솔",
    description:
      "조직·부서·사용자·업무 타입을 한 콘솔에서 관리하고, 슈퍼관리자는 전체 조직을 아우르는 권한으로 운영합니다.",
  },
  {
    icon: Bell,
    title: "실시간 알림",
    description:
      "멘션·댓글·답글이 달리면 실시간으로 알림을 받아 중요한 소통과 요청을 놓치지 않습니다.",
  },
  {
    icon: MessagesSquare,
    title: "댓글·멘션 협업",
    description:
      "타 부서 업무에도 댓글과 대댓글을 남기고 @멘션으로 담당자를 호출해 함께 논의하세요.",
  },
  {
    icon: Paperclip,
    title: "첨부파일 & 빠른 검색",
    description:
      "업무일지에 파일을 첨부하고, 제목·내용·기간 검색과 컬럼 정렬로 원하는 기록을 빠르게 찾아냅니다.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <Suspense fallback={null}>
          <LandingHeader />
        </Suspense>
        <div className="flex-1 w-full max-w-5xl flex flex-col gap-20 px-5 py-16 sm:py-20">
          <section className="flex flex-col items-center gap-8 py-12 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
              부서별 주간업무일지를
              <br />
              한 곳에서 기록하고 추적하세요
            </h1>
            <p className="max-w-xl text-muted-foreground">
              부서원은 주간 업무를 빠르게 기록하고, 관리자는 전체 부서의 업무
              현황을 한 곳에서 파악할 수 있는 업무 관리 서비스입니다.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
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
          </section>

          <section className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">주요 기능</h2>
              <p className="max-w-xl text-muted-foreground">
                기록부터 협업, 통계, 관리까지 — 주간업무 운영에 필요한 기능을 한
                곳에 담았습니다.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <feature.icon className="mb-2 size-8 text-primary" />
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}
