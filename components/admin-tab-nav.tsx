"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startRouteProgress } from "@/lib/route-progress";
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
  const router = useRouter();
  const activeTab = TABS.find((tab) => pathname.startsWith(tab.href)) ?? TABS[0];

  return (
    <nav>
      {/* 모바일: 탭 6개를 가로로 눌러 넣으면(overflow-x-auto) 화면 밖 탭이 안 보여
          "메뉴가 몇 개인지, 지금 몇 번째인지" 알기 어렵다는 피드백에 따라, 이 앱의 다른
          필터들(dashboard-filters.tsx 등)과 동일한 Select 컴포넌트로 전환했다 — 현재 탭이
          라벨로 항상 보이고, 나머지는 펼쳐서 한눈에 고를 수 있다. */}
      <div className="border-b pb-3 sm:hidden">
        <Select
          value={activeTab.href}
          onValueChange={(href) => {
            // 데스크탑 탭(TabPendingIndicator)과 달리 링크가 아니므로 전역 바를 직접 켠다.
            startRouteProgress();
            router.push(href);
          }}
        >
          <SelectTrigger className="w-full" aria-label="관리자 콘솔 메뉴 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TABS.map((tab) => (
              <SelectItem key={tab.href} value={tab.href}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* 데스크탑: 기존 가로 탭 그대로 유지 */}
      <div className="hidden gap-1 border-b sm:flex">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
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
      </div>
    </nav>
  );
}
