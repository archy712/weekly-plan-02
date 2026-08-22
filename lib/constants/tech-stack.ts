// 기술 스택 페이지 데이터 — 이 프로젝트를 구성하는 주요 프레임워크·라이브러리·도구를
// 분야별로 정리한 큐레이션 목록이다. package.json의 모든 의존성을 나열하는 대신(이전
// 버전은 그렇게 했음), 실제로 눈에 띄는 기술만 골라 한 줄 설명과 함께 보여준다 — 버전
// 배지·npm 링크·검색은 없다(버전은 자주 바뀌어 정적 페이지에 하드코딩하기 부적절하고,
// 이 페이지의 목적은 "무엇을 쓰는지"를 소개하는 것이지 패키지 브라우저가 아니기 때문).

export type TechItem = {
  name: string;
  description: string;
};

export type TechCategory = {
  id: string;
  title: string;
  items: TechItem[];
};

export const TECH_STACK: TechCategory[] = [
  {
    id: "core",
    title: "프레임워크 & 언어",
    items: [
      {
        name: "Next.js 16",
        description: 'App Router와 Cache Components("use cache") 기반의 최신 아키텍처',
      },
      { name: "React 19", description: "최신 React 기능을 기반으로 한 UI 구성" },
      { name: "TypeScript", description: "프로젝트 전반의 정적 타입 안전성" },
    ],
  },
  {
    id: "backend",
    title: "백엔드 & 인증",
    items: [
      {
        name: "Supabase Auth",
        description:
          "@supabase/ssr 기반 쿠키 세션 인증, 이메일/비밀번호 + Google OAuth 지원",
      },
      {
        name: "Zod + React Hook Form",
        description: "타입 안전한 스키마 검증과 폼 상태 관리",
      },
    ],
  },
  {
    id: "ui",
    title: "스타일링 & UI",
    items: [
      { name: "Tailwind CSS v4", description: "유틸리티 퍼스트 CSS 프레임워크" },
      {
        name: "shadcn/ui",
        description: "new-york 스타일의 Radix UI + Base UI 기반 컴포넌트 모음",
      },
      { name: "next-themes", description: "라이트 · 다크 · 시스템 테마 전환" },
      { name: "lucide-react", description: "2,000개 이상의 아이콘 세트" },
      { name: "recharts", description: "막대 · 선 · 영역 · 파이 · 레이더 등 차트 시각화" },
      { name: "dnd-kit", description: "드래그 앤 드롭 기반 칸반 보드" },
      { name: "Tiptap", description: "리치 텍스트 에디터" },
      {
        name: "TanStack Table",
        description: "정렬 · 페이지네이션을 지원하는 데이터 테이블",
      },
    ],
  },
  {
    id: "data-export",
    title: "데이터 & 문서 처리",
    items: [
      { name: "ExcelJS", description: "진행업무 Excel(.xlsx) 다운로드" },
      { name: "jsPDF + jspdf-autotable", description: "진행업무 PDF 다운로드" },
      {
        name: "isomorphic-dompurify",
        description: "리치 텍스트 콘텐츠 sanitize(저장·렌더링 양쪽)",
      },
    ],
  },
  {
    id: "devtools",
    title: "개발 도구",
    items: [
      {
        name: "ESLint",
        description: "eslint-config-next(core-web-vitals + typescript) 기반 코드 검사",
      },
    ],
  },
];

export const PLANNED_TECH_STACK: TechCategory = {
  id: "planned",
  title: "배포 & CI/CD",
  items: [
    {
      name: "Vercel",
      description:
        "Next.js 프로덕션 배포 대상으로 문서화되어 있으나(docs/guides/deployment-ops.md), 아직 실제 배포는 진행되지 않았습니다",
    },
    {
      name: "GitHub Actions",
      description: "PR 검증 · 테스트를 자동화하는 CI/CD, 아직 도입 전입니다",
    },
  ],
};
