import { Suspense } from "react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminTabNav } from "@/components/admin-tab-nav";
import { AdminLayoutSkeleton } from "@/components/admin-layout-skeleton";

// 관리자 콘솔은 진입마다 requireAdmin()의 서버 리다이렉트(부서 미설정/비관리자)를
// 거치는 auth 게이트라 애초에 "instant"(정적 셸) 대상이 될 수 없다. Next.js의
// instant UI 검증(dev 전용, cacheComponents: true 하에서 기본 활성화)이 이 redirect()를
// 검증 실패로 오인해 "validate instant UI" 콘솔 에러를 띄운다.
// `instant = false`만으로는 이 레이아웃 자체의 검증 피드백만 억제될 뿐,
// 하위 페이지(app/protected/admin/**/page.tsx)가 여전히 암묵적 검증 대상이라
// 검증 렌더가 이 레이아웃(AdminGuard)을 계속 거치면서 동일한 redirect()에 부딪힌다
// (실측 확인됨 — false만으로는 에러가 사라지지 않았음).
// unstable_disableValidation로 이 서브트리 전체의 검증 자체를 끈다.
export const instant = { unstable_disableValidation: true } as const;

async function AdminGuard({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">관리자 콘솔</h1>
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
