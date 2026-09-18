import { AdminDivisionsSkeleton } from "@/components/admin-divisions-skeleton";

// 관리자 콘솔 탭 전환 즉시 뜨는 스켈레톤(page.tsx의 Suspense fallback과 동일). 이 파일이
// 없으면 상위 app/protected/admin/loading.tsx의 범용 스켈레톤이 대신 떠서, 이미 렌더된 탭 바
// 아래에 제목·탭 모양 스켈레톤이 한 번 더 겹쳐 보인다.
// 바깥 컨테이너(div)는 app/protected/admin/layout.tsx가 이미 제공한다.
export default function Loading() {
  return <AdminDivisionsSkeleton />;
}
