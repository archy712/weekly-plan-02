import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Suspense } from "react";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { TechStackView } from "@/components/tech-stack-view";
import {
  TECH_STACK,
  normalizeVersion,
  type VersionInfo,
} from "@/lib/constants/tech-stack";
import { getLatestVersions } from "@/lib/queries/npm-versions";
import packageJson from "@/package.json";

export const metadata = {
  title: "기술 스택",
  description: "package.json을 기반으로 프로젝트의 기술 스택을 소개합니다.",
};

// node_modules 에 실제 설치된 버전을 읽는다("latest" 처럼 범위로 선언된 패키지의
// 구체 버전을 함께 보여주기 위함). 실패해도 화면은 spec 만으로 동작하도록 null 반환.
function readInstalledVersion(name: string): string | null {
  try {
    const path = join(process.cwd(), "node_modules", name, "package.json");
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      version?: unknown;
    };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

// 갤러리에 표시할 모든 패키지 이름(카테고리 순).
const ALL_PACKAGE_NAMES = TECH_STACK.flatMap((category) =>
  category.items.map((item) => item.name),
);

// package.json 선언값 + 설치 버전 + npm 최신 버전을 패키지명 → 버전 정보 맵으로 합친다.
function buildVersionMap(
  latestMap: Record<string, string | null>,
): Record<string, VersionInfo> {
  const all: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const map: Record<string, VersionInfo> = {};
  for (const [name, raw] of Object.entries(all)) {
    map[name] = {
      spec: normalizeVersion(raw),
      installed: readInstalledVersion(name),
      latest: latestMap[name] ?? null,
    };
  }
  return map;
}

// 왼쪽 배지에 npm 최신 버전을 쓰려면 registry 조회(비동기)가 필요하므로, 이 부분만
// 별도 async 컴포넌트로 분리해 Suspense 로 감싼다. 조회는 시간 단위로 캐싱된다.
async function TechStackContent() {
  const latestMap = await getLatestVersions(ALL_PACKAGE_NAMES);
  const versions = buildVersionMap(latestMap);
  return <TechStackView categories={TECH_STACK} versions={versions} />;
}

function TechStackFallback() {
  return (
    <p className="text-sm text-muted-foreground">
      최신 버전 정보를 불러오는 중…
    </p>
  );
}

export default function TechStackPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <Suspense fallback={null}>
        <LandingHeader />
      </Suspense>
      <div className="w-full max-w-6xl flex-1 px-4 pb-10 pt-4 sm:pb-14 sm:pt-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          홈으로
        </Link>
        <div className="mt-8 flex flex-col gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">기술 스택</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            이 프로젝트의 <span className="font-medium">package.json</span>을
            기준으로 사용 중인 패키지를 카테고리별로 모아 보여줍니다. 각 카드에는
            <span className="font-medium"> npm 최신 버전</span>(왼쪽)과{" "}
            <span className="font-medium">현재 설치된 버전</span>(오른쪽)을 함께
            표시하며, 카드를 누르면 해당 패키지의 npm 페이지가 새 탭에서 열립니다.
          </p>
        </div>

        <div className="mt-8">
          <Suspense fallback={<TechStackFallback />}>
            <TechStackContent />
          </Suspense>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
