import Link from "next/link";
import { Suspense } from "react";
import { Home } from "lucide-react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { HeaderNav } from "@/components/header-nav";
import { SiteHeaderTitle } from "@/components/site-header-title";
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

const headerTitleFallback = (
  <div className="flex items-center gap-2">
    <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <Home className="size-5" />
    </span>
    <Skeleton className="h-5 w-28" />
  </div>
);

export function SiteHeader() {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        {hasEnvVars ? (
          <Suspense fallback={headerTitleFallback}>
            <SiteHeaderTitle />
          </Suspense>
        ) : (
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="size-5" />
            </span>
            주간업무
          </Link>
        )}
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
