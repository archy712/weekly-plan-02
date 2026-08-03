import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <SiteHeader />
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <h1 className="text-3xl font-bold">부서별 주간업무일지 관리</h1>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}
