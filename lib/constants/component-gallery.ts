// 컴포넌트 갤러리 데이터 — shadcn/ui 레지스트리의 컴포넌트를 카테고리별로 정리한 카탈로그.
// 각 항목은 shadcn 공식 문서의 "Base UI" 변형 페이지로 연결된다
// (URL 구조: https://ui.shadcn.com/docs/components/base/{slug}).
// 이 프로젝트에 실제 설치된 컴포넌트는 Radix 계열이지만, 요구사항에 따라
// 갤러리는 Base UI 타입 문서만 노출한다.

export const BASE_UI_DOCS_BASE_URL =
  "https://ui.shadcn.com/docs/components/base";

export function componentDocsUrl(slug: string): string {
  return `${BASE_UI_DOCS_BASE_URL}/${slug}`;
}

export type GalleryComponent = {
  /** shadcn 문서 URL에 쓰이는 slug */
  slug: string;
  /** 화면에 표시할 이름 */
  name: string;
  /** 한 줄 설명 */
  description: string;
};

export type GalleryCategory = {
  id: string;
  title: string;
  description: string;
  components: GalleryComponent[];
};

export const COMPONENT_GALLERY: GalleryCategory[] = [
  {
    id: "forms",
    title: "폼 & 입력",
    description: "사용자 입력을 받고 값을 편집하는 컨트롤",
    components: [
      { slug: "button", name: "Button", description: "동작을 실행하는 기본 버튼" },
      { slug: "button-group", name: "Button Group", description: "여러 버튼을 하나로 묶은 그룹" },
      { slug: "checkbox", name: "Checkbox", description: "다중 선택 체크박스" },
      { slug: "combobox", name: "Combobox", description: "검색 가능한 자동완성 선택" },
      { slug: "field", name: "Field", description: "라벨·설명·에러를 묶은 폼 필드" },
      { slug: "input", name: "Input", description: "한 줄 텍스트 입력" },
      { slug: "input-group", name: "Input Group", description: "아이콘·버튼을 붙인 입력 그룹" },
      { slug: "input-otp", name: "Input OTP", description: "일회용 인증번호 입력" },
      { slug: "label", name: "Label", description: "폼 컨트롤 라벨" },
      { slug: "native-select", name: "Native Select", description: "브라우저 기본 셀렉트" },
      { slug: "radio-group", name: "Radio Group", description: "단일 선택 라디오 그룹" },
      { slug: "select", name: "Select", description: "커스텀 드롭다운 선택" },
      { slug: "slider", name: "Slider", description: "범위 값 슬라이더" },
      { slug: "switch", name: "Switch", description: "켜기/끄기 토글 스위치" },
      { slug: "textarea", name: "Textarea", description: "여러 줄 텍스트 입력" },
      { slug: "toggle", name: "Toggle", description: "눌림 상태를 가진 토글 버튼" },
      { slug: "toggle-group", name: "Toggle Group", description: "여러 토글을 묶은 그룹" },
    ],
  },
  {
    id: "datetime",
    title: "날짜 & 시간",
    description: "날짜·시간 선택 컨트롤",
    components: [
      { slug: "calendar", name: "Calendar", description: "날짜 선택 달력" },
      { slug: "date-picker", name: "Date Picker", description: "팝오버형 날짜 선택기" },
    ],
  },
  {
    id: "navigation",
    title: "네비게이션",
    description: "화면 이동과 구조 탐색",
    components: [
      { slug: "breadcrumb", name: "Breadcrumb", description: "현재 위치 경로 표시" },
      { slug: "menubar", name: "Menubar", description: "데스크톱형 상단 메뉴바" },
      { slug: "navigation-menu", name: "Navigation Menu", description: "드롭다운형 내비게이션" },
      { slug: "pagination", name: "Pagination", description: "페이지 이동 컨트롤" },
      { slug: "sidebar", name: "Sidebar", description: "접이식 사이드바 레이아웃" },
      { slug: "tabs", name: "Tabs", description: "탭 전환" },
    ],
  },
  {
    id: "overlays",
    title: "오버레이 & 팝업",
    description: "위에 겹쳐 뜨는 대화상자·메뉴·팝업",
    components: [
      { slug: "alert-dialog", name: "Alert Dialog", description: "확인이 필요한 모달 대화상자" },
      { slug: "command", name: "Command", description: "명령 팔레트 검색" },
      { slug: "context-menu", name: "Context Menu", description: "우클릭 컨텍스트 메뉴" },
      { slug: "dialog", name: "Dialog", description: "일반 모달 대화상자" },
      { slug: "drawer", name: "Drawer", description: "하단에서 올라오는 서랍" },
      { slug: "dropdown-menu", name: "Dropdown Menu", description: "클릭형 드롭다운 메뉴" },
      { slug: "hover-card", name: "Hover Card", description: "호버 시 뜨는 미리보기 카드" },
      { slug: "popover", name: "Popover", description: "앵커에 붙는 팝오버" },
      { slug: "sheet", name: "Sheet", description: "가장자리에서 나오는 패널" },
      { slug: "tooltip", name: "Tooltip", description: "간단한 툴팁" },
    ],
  },
  {
    id: "feedback",
    title: "피드백 & 상태",
    description: "진행·알림·빈 상태 표시",
    components: [
      { slug: "alert", name: "Alert", description: "인라인 안내/경고 배너" },
      { slug: "empty", name: "Empty", description: "데이터 없음 상태" },
      { slug: "progress", name: "Progress", description: "진행률 표시줄" },
      { slug: "skeleton", name: "Skeleton", description: "로딩 자리표시자" },
      { slug: "spinner", name: "Spinner", description: "로딩 스피너" },
      { slug: "toast", name: "Toast", description: "일시적 알림 토스트" },
    ],
  },
  {
    id: "data-display",
    title: "데이터 표시",
    description: "데이터를 보여주는 표·차트·배지",
    components: [
      { slug: "avatar", name: "Avatar", description: "사용자 아바타" },
      { slug: "badge", name: "Badge", description: "상태·라벨 배지" },
      { slug: "card", name: "Card", description: "콘텐츠 카드 컨테이너" },
      { slug: "chart", name: "Chart", description: "Recharts 기반 차트" },
      { slug: "data-table", name: "Data Table", description: "정렬·필터 지원 데이터 테이블" },
      { slug: "item", name: "Item", description: "아이콘·텍스트 조합 리스트 아이템" },
      { slug: "kbd", name: "Kbd", description: "키보드 단축키 표기" },
      { slug: "table", name: "Table", description: "기본 표" },
      { slug: "typography", name: "Typography", description: "본문 타이포그래피 스타일" },
    ],
  },
  {
    id: "layout",
    title: "레이아웃 & 구조",
    description: "배치·구분·펼침 컨테이너",
    components: [
      { slug: "accordion", name: "Accordion", description: "접었다 펴는 아코디언" },
      { slug: "aspect-ratio", name: "Aspect Ratio", description: "가로세로 비율 고정 박스" },
      { slug: "carousel", name: "Carousel", description: "슬라이드 캐러셀" },
      { slug: "collapsible", name: "Collapsible", description: "단일 펼침/접힘 영역" },
      { slug: "direction", name: "Direction", description: "LTR/RTL 방향 제공자" },
      { slug: "resizable", name: "Resizable", description: "크기 조절 가능한 패널" },
      { slug: "scroll-area", name: "Scroll Area", description: "커스텀 스크롤 영역" },
      { slug: "separator", name: "Separator", description: "구분선" },
    ],
  },
  {
    id: "chat",
    title: "AI & 채팅",
    description: "대화형·AI 인터페이스 요소",
    components: [
      { slug: "attachment", name: "Attachment", description: "첨부파일 표시" },
      { slug: "bubble", name: "Bubble", description: "채팅 말풍선" },
      { slug: "marker", name: "Marker", description: "텍스트 하이라이트 마커" },
      { slug: "message", name: "Message", description: "메시지 블록" },
      { slug: "message-scroller", name: "Message Scroller", description: "메시지 목록 스크롤러" },
      { slug: "questionnaire", name: "Questionnaire", description: "설문/질문 흐름" },
    ],
  },
];
