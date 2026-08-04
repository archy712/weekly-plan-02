import Link from "next/link";
import { Suspense } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { HeaderNav } from "@/components/header-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import { hasEnvVars } from "@/lib/utils";

const headerNavFallback = (
  <>
    <div className="hidden items-center gap-3 md:flex">
      <Skeleton className="h-8 w-20 rounded-md" />
      <Skeleton className="h-8 w-16 rounded-md" />
    </div>
    <Skeleton className="size-9 rounded-md md:hidden" />
  </>
);

export function SiteHeader() {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <Link href="/" className="font-semibold">
          IT부문 주간업무
        </Link>
        <div className="flex items-center gap-3">
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense fallback={headerNavFallback}>
              <HeaderNav />
            </Suspense>
          )}
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
