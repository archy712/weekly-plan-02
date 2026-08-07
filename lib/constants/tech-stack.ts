// 기술 스택 갤러리 데이터 — 프로젝트가 사용하는 패키지를 카테고리별로 정리한 카탈로그.
// 각 항목은 npm 패키지 페이지(https://www.npmjs.com/package/{name})로 연결된다.
// 버전은 여기서 하드코딩하지 않고, 페이지가 package.json 을 읽어 주입한다
// (app/tech-stack/page.tsx 참고). 아래 name 은 반드시 package.json 의 의존성
// 키와 일치해야 버전이 표시된다.

export const NPM_BASE_URL = "https://www.npmjs.com/package";

export function npmUrl(name: string): string {
  return `${NPM_BASE_URL}/${name}`;
}

// package.json 의 "^1.2.3" / "~1.2.3" / "1.2.3" / "latest" 를 표시용으로 정리한다.
export function normalizeVersion(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw === "latest" || raw === "*") return raw;
  return raw.replace(/^[\^~]/, "");
}

// 버전 spec 이 실제 버전 번호(예: "1.2.3")인지 여부.
export function isNumericVersion(spec: string | null): boolean {
  return !!spec && /^\d/.test(spec);
}

export type VersionInfo = {
  /** package.json 에 선언된 값 (예: "16.2.12" 또는 "latest") */
  spec: string | null;
  /** node_modules 에서 해석한 실제 설치 버전 */
  installed: string | null;
  /** npm registry 의 최신(latest) 버전. 조회 실패 시 null */
  latest: string | null;
};

export type TechItem = {
  /** package.json 의존성 키와 동일해야 함 */
  name: string;
  description: string;
};

export type TechCategory = {
  id: string;
  title: string;
  description: string;
  items: TechItem[];
};

export const TECH_STACK: TechCategory[] = [
  {
    id: "core",
    title: "프레임워크 & 코어",
    description: "앱의 뼈대를 이루는 프레임워크와 언어",
    items: [
      { name: "next", description: "App Router 기반 React 풀스택 프레임워크" },
      { name: "react", description: "UI 라이브러리" },
      { name: "react-dom", description: "React의 DOM 렌더러" },
      { name: "typescript", description: "정적 타입을 더한 JavaScript" },
    ],
  },
  {
    id: "backend",
    title: "백엔드 & 인증",
    description: "데이터베이스·인증·세션 처리",
    items: [
      { name: "@supabase/supabase-js", description: "Supabase 클라이언트 SDK" },
      { name: "@supabase/ssr", description: "쿠키 기반 SSR 세션 연동" },
    ],
  },
  {
    id: "ui",
    title: "UI & 스타일링",
    description: "컴포넌트·스타일·테마·토스트",
    items: [
      { name: "tailwindcss", description: "유틸리티 우선 CSS 프레임워크" },
      { name: "@tailwindcss/postcss", description: "Tailwind v4 PostCSS 플러그인" },
      { name: "tw-animate-css", description: "Tailwind 애니메이션 유틸리티" },
      { name: "radix-ui", description: "shadcn/ui의 접근성 헤드리스 프리미티브" },
      { name: "@radix-ui/react-slot", description: "asChild 패턴용 Slot" },
      { name: "@radix-ui/react-dropdown-menu", description: "드롭다운 메뉴 프리미티브" },
      { name: "@radix-ui/react-checkbox", description: "체크박스 프리미티브" },
      { name: "@radix-ui/react-label", description: "폼 라벨 프리미티브" },
      { name: "lucide-react", description: "아이콘 세트" },
      { name: "class-variance-authority", description: "변형(variant) 기반 클래스 관리" },
      { name: "clsx", description: "조건부 className 조합" },
      { name: "tailwind-merge", description: "충돌하는 Tailwind 클래스 병합" },
      { name: "next-themes", description: "다크모드 테마 전환" },
      { name: "sonner", description: "토스트 알림" },
    ],
  },
  {
    id: "forms",
    title: "폼 & 검증",
    description: "폼 상태 관리와 스키마 검증",
    items: [
      { name: "react-hook-form", description: "성능 좋은 폼 상태 관리" },
      { name: "@hookform/resolvers", description: "RHF와 검증 라이브러리 연결" },
      { name: "zod", description: "TypeScript 우선 스키마 검증" },
    ],
  },
  {
    id: "content",
    title: "리치 텍스트 & 보안",
    description: "에디터와 HTML 새니타이즈",
    items: [
      { name: "@tiptap/react", description: "Tiptap 리치 텍스트 에디터 (React)" },
      { name: "@tiptap/starter-kit", description: "Tiptap 기본 확장 묶음" },
      { name: "@tiptap/pm", description: "Tiptap의 ProseMirror 코어" },
      { name: "dompurify", description: "브라우저 HTML 새니타이저" },
      { name: "sanitize-html", description: "서버/동형 HTML 새니타이저" },
    ],
  },
  {
    id: "export",
    title: "문서 & 내보내기",
    description: "PDF·Excel 파일 생성",
    items: [
      { name: "jspdf", description: "클라이언트 PDF 생성" },
      { name: "jspdf-autotable", description: "jsPDF 표 생성 플러그인" },
      { name: "exceljs", description: "Excel(.xlsx) 읽기/쓰기" },
    ],
  },
  {
    id: "dataviz",
    title: "데이터 시각화",
    description: "대시보드 차트",
    items: [
      { name: "recharts", description: "React 기반 차트 라이브러리" },
    ],
  },
  {
    id: "devtools",
    title: "개발 도구",
    description: "린트·빌드·타입 정의",
    items: [
      { name: "eslint", description: "코드 린터" },
      { name: "eslint-config-next", description: "Next.js ESLint 설정" },
      { name: "postcss", description: "CSS 변환 도구" },
      { name: "@types/node", description: "Node.js 타입 정의" },
      { name: "@types/react", description: "React 타입 정의" },
      { name: "@types/react-dom", description: "React DOM 타입 정의" },
      { name: "@types/sanitize-html", description: "sanitize-html 타입 정의" },
    ],
  },
];
