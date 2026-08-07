import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // PDF용 한글 폰트(NotoSansKR-Regular.ttf, 약 2.5MB)는 내용이 고정된 정적 자산인데
  // /public 파일의 Next 기본 응답은 max-age=0이라 재방문 시 매번 재검증(304) 왕복이 든다.
  // 파일명이 안정적이므로 장기 immutable 캐시를 부여해 브라우저가 강하게 캐시하도록 한다
  // (폰트 교체가 필요하면 파일명을 바꾸는 표준 관례를 따른다).
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
