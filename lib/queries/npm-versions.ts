import { cacheLife } from "next/cache";

// npm registry 에서 패키지의 최신(dist-tag: latest) 버전을 조회한다.
// 기술 스택 페이지의 "왼쪽 배지 = npm 최신 버전" 표시에 사용된다.
const REGISTRY_BASE_URL = "https://registry.npmjs.org";

async function fetchLatestVersion(name: string): Promise<string | null> {
  try {
    // 스코프 패키지(@scope/name)도 raw 이름 그대로 요청하면 정상 동작한다.
    const res = await fetch(`${REGISTRY_BASE_URL}/${name}/latest`);
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === "string" ? data.version : null;
  } catch {
    // 오프라인·레지스트리 장애 등에서는 null 을 반환해 화면이 폴백되도록 한다.
    return null;
  }
}

// 여러 패키지의 최신 버전을 한 번에 조회한다. cacheComponents(`"use cache"`) 하에서
// 시간 단위로 캐싱해 매 요청마다 registry 를 호출하지 않는다. 조회 실패한 항목은
// null 로 남아 호출부에서 선언/설치 버전으로 폴백한다.
export async function getLatestVersions(
  names: string[],
): Promise<Record<string, string | null>> {
  "use cache";
  cacheLife("hours");

  const entries = await Promise.all(
    names.map(
      async (name) => [name, await fetchLatestVersion(name)] as const,
    ),
  );
  return Object.fromEntries(entries);
}
