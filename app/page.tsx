// 서비스 랜딩(루트 "/") 페이지 — 비로그인 사용자에게 서비스를 소개하고 로그인/회원가입으로
// 유도하며, 로그인 사용자에게는 자기 조직의 주간업무로 진입하는 CTA를 보여준다.
// proxy.ts(lib/supabase/proxy.ts)의 비로그인 리다이렉트 예외에 "/"가 포함돼 있어 인증 없이
// 접근 가능한 공개 페이지다.
//
// 이 파일 자체는 async 데이터 접근이 없는 순수 동기 Server Component이며(정적 렌더 가능),
// 쿠키(getClaims)에 의존하는 동적 부분(LandingHeader·HeroCta)만 각각 <Suspense>로 격리한다.
// next.config.ts의 cacheComponents: true 하에서 Suspense 밖의 동적 데이터 접근은 프로덕션
// 빌드를 실패시키므로(공개 정보 페이지 F036~F038과 동일 제약), 이 경계 설정은 필수다.
import { Suspense } from "react";
// 주요 기능 카드에 쓰이는 lucide 아이콘들 — 아래 features 배열에서 각 항목의 icon으로 사용.
import {
  Bell,
  BellRing,
  Bookmark,
  Building2,
  CalendarRange,
  FileDown,
  FileText,
  History,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Paperclip,
  Save,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

// LandingHeader/HeroCta: 쿠키 기반 세션(getClaims)을 읽는 동적 Server Component (아래 Suspense로 감쌈).
// SiteFooter: 공개 정보 페이지(컴포넌트/아이콘/기술 스택 갤러리)로 진입하는 공통 푸터 (정적).
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
// Skeleton: HeroCta가 세션을 확인하는 동안(Suspense pending) 보여줄 버튼 자리표시자.
import { Skeleton } from "@/components/ui/skeleton";

// 히어로 아래 "주요 기능" 섹션에 3열 그리드로 렌더링되는 기능 소개 카드 데이터.
// 모듈 최상단의 정적 상수라 렌더마다 재생성되지 않으며, 각 실제 기능의 위치는 CLAUDE.md의
// 해당 절(리치 텍스트 에디터·조직 계층·업무 타입/중요도·PDF/Excel·대시보드·관리자 콘솔·
// 실시간 알림·댓글/멘션·첨부파일, v2: F040~F047 각 기능 절)을 참고.
// 순서 = 화면 노출 순서, title은 카드 key로도 쓰인다.
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
      "업무일지에 파일을 첨부하고, 제목·내용·기간 검색과 컬럼 정렬로 원하는 기록을 빠르게 찾아내며 검색어는 하이라이트로 바로 확인할 수 있습니다.",
  },
  {
    icon: UserCheck,
    title: "내 업무 요약 위젯",
    description:
      "목록에 들어가는 즉시 본인 담당 업무의 지연·이번 주 마감·진행중 건수를 한눈에 확인하세요.",
  },
  {
    icon: Save,
    title: "작성 중 임시저장",
    description:
      "새로고침하거나 실수로 페이지를 벗어나도 작성 중이던 내용이 브라우저에 자동 저장되어 그대로 복원할 수 있습니다.",
  },
  {
    icon: BellRing,
    title: "정기 리마인더 & 알림 설정",
    description:
      "이번 주 업무일지를 아직 작성하지 않았다면 알림으로 알려드리고, 댓글·멘션·리마인더 알림은 원하는 대로 켜고 끌 수 있습니다.",
  },
  {
    icon: History,
    title: "변경 이력 추적",
    description:
      "진행 상태·업무 타입·중요도가 언제 누구에 의해 바뀌었는지 상세 페이지에서 이력으로 되짚어보세요.",
  },
  {
    icon: Bookmark,
    title: "필터 프리셋 저장",
    description:
      "자주 쓰는 필터 조합을 이름 붙여 저장해두고, 목록·칸반 어디서든 한 번의 선택으로 다시 적용하세요.",
  },
  {
    icon: CalendarRange,
    title: "타임라인 뷰",
    description:
      "시작일부터 목표종료일까지 업무 일정을 시간축 위에 나란히 배치해 전체 흐름을 한눈에 파악합니다.",
  },
];

export default function Home() {
  return (
    // 전체 페이지 세로 플렉스 컨테이너: 최소 화면 높이를 채워 푸터가 항상 하단에 붙게 한다.
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-5 items-center">
        {/* 헤더 + 본문 콘텐츠 묶음(푸터 제외). gap-20으로 헤더와 히어로 사이 간격 확보. */}
        <div className="flex-1 w-full flex flex-col gap-20 items-center">
          {/* 헤더: 쿠키(getClaims)를 읽는 동적 컴포넌트라 Suspense로 격리(cacheComponents 제약).
              비로그인 시에는 LandingHeader가 null을 반환하므로 fallback도 null(자리 차지 안 함). */}
          <Suspense fallback={null}>
            <LandingHeader />
          </Suspense>
          {/* 본문 폭 제한 컨테이너(max-w-5xl). 상하 패딩은 sm 이상에서 넓어지는 반응형. */}
          <div className="w-full max-w-5xl flex flex-col gap-10 px-5 pb-16 pt-8 sm:pb-20 sm:pt-10">
          {/* ── 히어로 섹션: 서비스 한 줄 소개 + CTA ── */}
          <section className="flex flex-col items-center gap-8 py-6 text-center">
            {/* 대표 헤드라인. <br/>로 두 줄 고정, 폰트 크기는 sm/md에서 단계적으로 확대. */}
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
              {/* CTA 버튼: HeroCta가 세션을 조회해 로그인 상태(→"주간업무 보러가기")와
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
          </section>

          {/* ── 주요 기능 섹션: features 배열을 카드 그리드로 렌더링 ── */}
          <section className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">주요 기능</h2>
              <p className="max-w-xl text-muted-foreground">
                기록부터 협업, 통계, 관리까지 — 주간업무 운영에 필요한 기능을 한
                곳에 담았습니다.
              </p>
            </div>
            {/* 반응형 그리드: 모바일 1열 → sm 2열 → lg 3열. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                // title은 배열 내 고유하므로 key로 사용. feature.icon은 컴포넌트 참조라 JSX로 렌더.
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
        </div>
        {/* 공통 푸터: 정적이므로 Suspense 불필요. 공개 정보 페이지(F036~F038)로 진입. */}
        <SiteFooter />
      </div>
    </main>
  );
}
