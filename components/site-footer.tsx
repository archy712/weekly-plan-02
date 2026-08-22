import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full flex flex-col items-center justify-center gap-3 border-t mx-auto text-center text-xs pt-8 pb-16">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <a
          href="https://github.com/archy712/weekly-plan-02/blob/main/README.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          프로젝트 소개
        </a>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <a
          href="https://github.com/archy712/weekly-plan-02/blob/main/docs/prd/PRD.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          프로젝트 요구사항
        </a>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <a
          href="https://github.com/archy712/weekly-plan-02/blob/main/docs/roadmap/ROADMAP_mvp.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          초기 MVP 과제
        </a>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <a
          href="https://github.com/archy712/weekly-plan-02/blob/main/docs/roadmap/ROADMAP_v1.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          고도화 1차 과제
        </a>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <a
          href="https://github.com/archy712/weekly-plan-02/blob/main/docs/roadmap/ROADMAP_V2.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          고도화 2차 과제
        </a>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <a
          href="https://github.com/archy712/weekly-plan-02/blob/main/docs/roadmap/ROADMAP_v3.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          고도화 3차 과제
        </a>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <Link
          href="/component-gallery"
          className="hover:text-foreground"
        >
          컴포넌트 갤러리
        </Link>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <Link
          href="/icon-gallery"
          className="hover:text-foreground"
        >
          아이콘 갤러리
        </Link>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <Link
          href="/tech-stack"
          className="hover:text-foreground"
        >
          기술 스택
        </Link>
      </div>
      <p className="mt-3">
        Developed by <span>archy712@gmail.com</span>
      </p>
    </footer>
  );
}
