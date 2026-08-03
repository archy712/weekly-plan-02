import type { Department, WeeklyLog, WeeklyLogListItem } from "@/lib/types";

export const dummyDepartments: Department[] = [
  {
    id: "d1000000-0000-0000-0000-000000000001",
    name: "개발팀",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "d1000000-0000-0000-0000-000000000002",
    name: "디자인팀",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "d1000000-0000-0000-0000-000000000003",
    name: "마케팅팀",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "d1000000-0000-0000-0000-000000000004",
    name: "인사팀",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "d1000000-0000-0000-0000-000000000005",
    name: "영업팀",
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

type DummyAuthor = {
  id: string;
  name: string;
};

const dummyAuthors: Record<string, DummyAuthor> = {
  dev: { id: "a1000000-0000-0000-0000-000000000001", name: "김도윤" },
  design: { id: "a1000000-0000-0000-0000-000000000002", name: "이서연" },
  marketing: { id: "a1000000-0000-0000-0000-000000000003", name: "박지훈" },
  hr: { id: "a1000000-0000-0000-0000-000000000004", name: "최민서" },
  sales: { id: "a1000000-0000-0000-0000-000000000005", name: "정하윤" },
};

export type DummyWeeklyLog = WeeklyLog & {
  department_name: string;
  author_name: string;
};

function department(index: number) {
  return dummyDepartments[index];
}

const raw: Array<{
  id: string;
  departmentIndex: number;
  author: DummyAuthor;
  title: string;
  content: string;
  start_date: string;
  target_end_date: string;
  is_completed: boolean;
}> = [
  {
    id: "e1000000-0000-0000-0000-000000000001",
    departmentIndex: 0,
    author: dummyAuthors.dev,
    title: "주간업무일지 목록/상세 API 설계",
    content: "weekly_logs 테이블 조회 쿼리와 부서별 필터링 로직을 설계하고 RLS 정책 초안을 검토했습니다.",
    start_date: "2026-07-06",
    target_end_date: "2026-07-10",
    is_completed: true,
  },
  {
    id: "e1000000-0000-0000-0000-000000000002",
    departmentIndex: 0,
    author: dummyAuthors.dev,
    title: "인증 미들웨어 리팩터링",
    content: "proxy.ts의 세션 갱신 로직을 점검하고 부서 온보딩 게이트 추가를 위한 사전 조사를 진행했습니다.",
    start_date: "2026-07-13",
    target_end_date: "2026-07-17",
    is_completed: true,
  },
  {
    id: "e1000000-0000-0000-0000-000000000003",
    departmentIndex: 0,
    author: dummyAuthors.dev,
    title: "PDF 다운로드 기능 검토",
    content: "jsPDF 한글 폰트 임베딩 방식을 조사하고 번들 크기 영향을 측정했습니다.",
    start_date: "2026-07-20",
    target_end_date: "2026-07-24",
    is_completed: false,
  },
  {
    id: "e1000000-0000-0000-0000-000000000004",
    departmentIndex: 0,
    author: dummyAuthors.dev,
    title: "코드 리뷰 프로세스 정비",
    content: "PR 템플릿과 리뷰 체크리스트를 업데이트하고 팀에 공유했습니다.",
    start_date: "2026-07-27",
    target_end_date: "2026-07-31",
    is_completed: false,
  },
  {
    id: "e1000000-0000-0000-0000-000000000005",
    departmentIndex: 1,
    author: dummyAuthors.design,
    title: "랜딩 페이지 와이어프레임 제작",
    content: "히어로 섹션과 기능 소개 카드 4종의 와이어프레임을 제작하고 팀 리뷰를 받았습니다.",
    start_date: "2026-07-06",
    target_end_date: "2026-07-10",
    is_completed: true,
  },
  {
    id: "e1000000-0000-0000-0000-000000000006",
    departmentIndex: 1,
    author: dummyAuthors.design,
    title: "다크모드 색상 팔레트 정리",
    content: "라이트/다크 테마 대비 확인 후 배지·버튼 색상 토큰을 정리했습니다.",
    start_date: "2026-07-13",
    target_end_date: "2026-07-15",
    is_completed: true,
  },
  {
    id: "e1000000-0000-0000-0000-000000000007",
    departmentIndex: 1,
    author: dummyAuthors.design,
    title: "모바일 반응형 레이아웃 검토",
    content: "목록 페이지의 테이블→카드 전환 시안을 제작 중입니다.",
    start_date: "2026-07-20",
    target_end_date: "2026-07-24",
    is_completed: false,
  },
  {
    id: "e1000000-0000-0000-0000-000000000008",
    departmentIndex: 2,
    author: dummyAuthors.marketing,
    title: "3분기 캠페인 기획안 작성",
    content: "신규 서비스 출시에 맞춘 마케팅 캠페인 기획안을 작성하고 예산안을 정리했습니다.",
    start_date: "2026-07-06",
    target_end_date: "2026-07-12",
    is_completed: true,
  },
  {
    id: "e1000000-0000-0000-0000-000000000009",
    departmentIndex: 2,
    author: dummyAuthors.marketing,
    title: "SNS 콘텐츠 캘린더 정리",
    content: "8월 SNS 게시 일정을 채널별로 정리하고 디자인팀에 시안을 요청했습니다.",
    start_date: "2026-07-13",
    target_end_date: "2026-07-17",
    is_completed: false,
  },
  {
    id: "e1000000-0000-0000-0000-000000000010",
    departmentIndex: 2,
    author: dummyAuthors.marketing,
    title: "광고 성과 리포트 분석",
    content: "지난달 광고 채널별 전환율을 분석하고 예산 재배분안을 검토했습니다.",
    start_date: "2026-07-20",
    target_end_date: "2026-07-24",
    is_completed: false,
  },
  {
    id: "e1000000-0000-0000-0000-000000000011",
    departmentIndex: 3,
    author: dummyAuthors.hr,
    title: "신입사원 온보딩 자료 업데이트",
    content: "부서 소개 자료와 사내 시스템 가이드를 최신 조직도에 맞춰 갱신했습니다.",
    start_date: "2026-07-06",
    target_end_date: "2026-07-08",
    is_completed: true,
  },
  {
    id: "e1000000-0000-0000-0000-000000000012",
    departmentIndex: 3,
    author: dummyAuthors.hr,
    title: "하반기 채용 계획 수립",
    content: "부서별 채용 수요를 취합하고 하반기 채용 일정을 초안으로 작성했습니다.",
    start_date: "2026-07-13",
    target_end_date: "2026-07-19",
    is_completed: true,
  },
  {
    id: "e1000000-0000-0000-0000-000000000013",
    departmentIndex: 3,
    author: dummyAuthors.hr,
    title: "복지제도 만족도 설문 설계",
    content: "전사 복지제도 만족도 설문 문항을 설계하고 배포 일정을 조율 중입니다.",
    start_date: "2026-07-20",
    target_end_date: "2026-07-26",
    is_completed: false,
  },
  {
    id: "e1000000-0000-0000-0000-000000000014",
    departmentIndex: 4,
    author: dummyAuthors.sales,
    title: "주요 거래처 분기 미팅",
    content: "상위 5개 거래처와 분기 실적 리뷰 미팅을 진행하고 다음 분기 물량을 협의했습니다.",
    start_date: "2026-07-06",
    target_end_date: "2026-07-10",
    is_completed: true,
  },
  {
    id: "e1000000-0000-0000-0000-000000000015",
    departmentIndex: 4,
    author: dummyAuthors.sales,
    title: "신규 리드 발굴 및 컨택",
    content: "신규 리드 30건을 발굴하고 초기 컨택 메일을 발송했습니다.",
    start_date: "2026-07-13",
    target_end_date: "2026-07-17",
    is_completed: false,
  },
  {
    id: "e1000000-0000-0000-0000-000000000016",
    departmentIndex: 4,
    author: dummyAuthors.sales,
    title: "8월 영업 목표 설정",
    content: "부서별 8월 매출 목표를 설정하고 실행 계획을 팀과 공유했습니다.",
    start_date: "2026-07-27",
    target_end_date: "2026-07-31",
    is_completed: false,
  },
];

export const dummyWeeklyLogs: DummyWeeklyLog[] = raw.map((item) => {
  const dept = department(item.departmentIndex);
  return {
    id: item.id,
    department_id: dept.id,
    department_name: dept.name,
    author_id: item.author.id,
    author_name: item.author.name,
    title: item.title,
    content: item.content,
    start_date: item.start_date,
    target_end_date: item.target_end_date,
    is_completed: item.is_completed,
    created_at: `${item.start_date}T09:00:00.000Z`,
    updated_at: `${item.start_date}T09:00:00.000Z`,
  };
});

export const dummyWeeklyLogListItems: WeeklyLogListItem[] = dummyWeeklyLogs.map(
  (log) => ({
    id: log.id,
    title: log.title,
    start_date: log.start_date,
    target_end_date: log.target_end_date,
    is_completed: log.is_completed,
    department_id: log.department_id,
    department_name: log.department_name,
  }),
);
