// 컴포넌트 갤러리 탭 목록. 각 탭의 실제 데모 내용은 components/component-gallery/tab-*.tsx에
// 하드코딩되어 있다 — 컴포넌트마다 실제 동작하는 라이브 데모라 링크 목록처럼 데이터 주도로
// 만들 수 없어, 이 파일은 탭 순서/라벨만 담는다.
export type GalleryTab = {
  id: string;
  label: string;
};

export const GALLERY_TABS: GalleryTab[] = [
  { id: "buttons-badges", label: "버튼 & 배지" },
  { id: "form-inputs", label: "폼 입력" },
  { id: "overlays-menus", label: "오버레이 & 메뉴" },
  { id: "navigation", label: "내비게이션" },
  { id: "layout", label: "레이아웃" },
  { id: "feedback", label: "피드백" },
  { id: "data-display", label: "데이터 표시" },
  { id: "charts", label: "차트" },
  { id: "ai-chat", label: "AI 채팅 요소" },
  { id: "extended", label: "추가 확장 컴포넌트" },
];
