import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - fonts - .ttf, .woff, .woff2, .otf
     * 폰트도 이미지와 동일한 공개 정적 자산이라 세션 갱신(updateSession)을 거칠 필요가 없다.
     * 제외하면 PDF용 한글 폰트(/fonts/*.ttf) 요청이 인증 왕복 없이 정적으로 서빙되어
     * next.config.ts의 immutable 캐시 헤더와 함께 브라우저/CDN이 깔끔하게 캐시할 수 있다.
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2|otf)$).*)",
  ],
};
