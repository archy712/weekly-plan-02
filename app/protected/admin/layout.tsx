import { Suspense } from "react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminTabNav } from "@/components/admin-tab-nav";
import { AdminLayoutSkeleton } from "@/components/admin-layout-skeleton";

async function AdminGuard({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">관리자 콘솔</h1>
        <p className="text-sm text-muted-foreground">
          부서와 사용자를 관리합니다.
        </p>
      </div>
      <AdminTabNav />
      {children}
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <Suspense fallback={<AdminLayoutSkeleton />}>
        <AdminGuard>{children}</AdminGuard>
      </Suspense>
    </div>
  );
}
