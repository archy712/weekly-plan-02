"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/protected/admin/dashboard", label: "대시보드" },
  { href: "/protected/admin/organizations", label: "부문 관리" },
  { href: "/protected/admin/divisions", label: "부서 관리" },
  { href: "/protected/admin/departments", label: "팀 관리" },
  { href: "/protected/admin/work-types", label: "업무타입 관리" },
  { href: "/protected/admin/users", label: "사용자 관리" },
];

// 탭 전환은 다른 라우트로의 이동이라 대상 페이지의 Suspense 스켈레톤이 결국 뜨지만, 클릭
// 직후 RSC 페이로드를 받아오는 짧은 공백 동안에는 아무 반응이 없다. useLinkStatus는 감싸는
// <Link>의 pending 상태를 읽어(Link 하위에서만 동작) 그 공백에 즉각적인 스피너를 보여준다.
function TabPendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className="size-3.5 animate-spin" aria-hidden />;
}

export function AdminTabNav() {
  const pathname = usePathname();

  return (
    // 탭 6개가 좁은 화면에서 flex-wrap 없이 그대로 눌리면 각 탭 라벨이 줄바꿈되며 세로로
    // 쌓인 것처럼 보인다 — overflow-x-auto + shrink-0 + whitespace-nowrap으로 줄바꿈 대신
    // 가로 스크롤을 쓰도록 바꾼다(탭 UI의 표준 모바일 패턴).
    <nav className="-mx-5 flex gap-1 overflow-x-auto border-b px-5 sm:mx-0 sm:px-0">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <TabPendingIndicator />
          </Link>
        );
      })}
    </nav>
  );
}
