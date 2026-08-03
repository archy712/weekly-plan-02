import Link from "next/link";
import { Building2, CheckCircle2, Download, FileText } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: FileText,
    title: "주간업무일지 작성/조회",
    description:
      "시작일·목표종료일·제목·본문으로 주간 업무를 빠르게 기록하고 언제든 다시 확인하세요.",
  },
  {
    icon: Building2,
    title: "부서별 관리",
    description:
      "일반 사용자는 소속 부서만, 관리자는 부서 필터로 전체 조직의 현황을 한눈에 파악할 수 있습니다.",
  },
  {
    icon: CheckCircle2,
    title: "완료 상태 추적",
    description:
      "업무 완료 여부를 손쉽게 전환하며 팀의 진행 상황을 실시간으로 관리하세요.",
  },
  {
    icon: Download,
    title: "PDF 다운로드",
    description:
      "현재 조회 중인 부서의 업무 목록을 표 형태 PDF로 내려받아 보고 자료로 활용하세요.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <SiteHeader />
        <div className="flex-1 w-full max-w-5xl flex flex-col gap-16 p-5">
          <section className="flex flex-col items-center gap-6 py-12 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
              부서별 주간업무일지를
              <br />
              한 곳에서 기록하고 추적하세요
            </h1>
            <p className="max-w-xl text-muted-foreground">
              부서원은 주간 업무를 빠르게 기록하고, 관리자는 전체 부서의 업무
              현황을 한 곳에서 파악할 수 있는 업무 관리 서비스입니다.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/auth/login">로그인</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/sign-up">회원가입</Link>
              </Button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </section>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}
