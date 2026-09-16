import { AtSign, Plus, Search, TriangleAlert } from "lucide-react";

import { getAvatarPreset } from "@/lib/constants/avatars";
import { cn } from "@/lib/utils";

// 랜딩 히어로 아래에 놓이는 "제품 미리보기" — 브라우저 크롬 프레임 안에 실제 칸반 화면을
// 본뜬 목업을 그린다. 이미지 파일(스크린샷) 대신 마크업으로 조립한 이유는 두 가지다:
//   (1) public/에 스크린샷을 두면 다크모드용 이미지를 따로 관리해야 하는데, 마크업 목업은
//       기존 테마 토큰(bg-card/border/muted 등)을 그대로 쓰므로 라이트·다크가 자동 대응된다.
//   (2) 이미지 요청/용량이 0이라 랜딩의 LCP에 부담을 주지 않는다.
// 실제 앱 스크린샷으로 교체하고 싶다면 아래 <KanbanMockup /> 자리를 next/image로 바꾸고,
// 라이트/다크 두 벌을 준비해 dark: 유틸리티로 전환하면 된다(프레임·글로우는 그대로 재사용).
//
// 순수 표현용 목업이므로 데이터는 전부 이 파일 안의 정적 상수이며, 실제 DB와 무관하다.

type MockCard = {
  title: string;
  workType: string;
  avatarKey: string;
  progress: number;
  /** 지연 상태(목표종료일 초과) 강조 여부 — 칸반의 실제 지연 표시를 흉내 낸다. */
  overdue?: boolean;
};

const COLUMNS: { title: string; count: number; dotClass: string; cards: MockCard[] }[] = [
  {
    title: "대기",
    count: 4,
    dotClass: "bg-muted-foreground/40",
    cards: [
      { title: "3분기 인프라 비용 절감안 검토", workType: "기획", avatarKey: "penguin", progress: 0 },
      { title: "사내 포털 접근권한 정비", workType: "운영", avatarKey: "koala", progress: 0 },
    ],
  },
  {
    title: "진행중",
    count: 7,
    dotClass: "bg-warning",
    cards: [
      { title: "진행업무 대시보드 차트 개편", workType: "개발", avatarKey: "fox", progress: 72 },
      { title: "협력사 계약서 표준양식 개정", workType: "기획", avatarKey: "owl", progress: 45, overdue: true },
      { title: "모바일 반응형 QA 2차", workType: "QA", avatarKey: "frog", progress: 30 },
    ],
  },
  {
    title: "완료",
    count: 12,
    dotClass: "bg-success",
    cards: [
      { title: "알림 구독 설정 배포", workType: "개발", avatarKey: "unicorn", progress: 100 },
      { title: "상반기 업무 보고서 취합", workType: "보고", avatarKey: "rabbit", progress: 100 },
    ],
  },
];

const VIEW_TABS = ["목록", "칸반", "타임라인"];

export function LandingAppPreview() {
  return (
    // 히어로 섹션이 text-center라 그대로 두면 목업 내부 텍스트까지 가운데 정렬되므로
    // 여기서 text-left로 되돌린다(실제 앱 화면은 좌측 정렬이다).
    <div className="relative w-full text-left">
      {/* 프레임 뒤에서 퍼지는 글로우 — 프레임이 배경에서 떠 보이게 하는 역할. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 -top-6 bottom-8 -z-10 rounded-[50%] bg-foreground/10 blur-3xl dark:bg-foreground/[0.07]"
      />
      {/* perspective를 부모에 두고 자식에 rotateX를 적용해야 원근이 생긴다(자식에 함께 주면 평면 회전). */}
      <div className="mx-auto w-full max-w-4xl [perspective:1600px]">
        <div className="origin-top overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-black/[0.04] [transform:rotateX(7deg)] dark:ring-white/[0.06]">
          {/* ── 브라우저 크롬: 신호등 버튼 + 주소창 ── */}
          <div className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-destructive/60" />
              <span className="size-2.5 rounded-full bg-warning/60" />
              <span className="size-2.5 rounded-full bg-success/60" />
            </div>
            <div className="mx-auto hidden max-w-[260px] flex-1 truncate rounded-md bg-background px-3 py-1 text-center text-[10px] text-muted-foreground sm:block">
              weekly-plan.app/protected/weekly-logs
            </div>
          </div>

          <KanbanMockup />
        </div>
      </div>

      {/* ── 프레임 밖으로 살짝 걸치는 플로팅 칩 2개 ──
          좁은 화면에서는 프레임을 가리므로 md 미만에서는 숨긴다. */}
      <div className="pointer-events-none absolute -left-2 top-24 hidden items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 shadow-lg backdrop-blur md:flex lg:-left-8">
        <span className="flex size-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <TriangleAlert className="size-4" />
        </span>
        <span className="text-left text-xs leading-tight">
          <span className="block font-semibold">지연 3건</span>
          <span className="block text-muted-foreground">내 업무 요약</span>
        </span>
      </div>
      <div className="pointer-events-none absolute -right-2 bottom-8 hidden items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 shadow-lg backdrop-blur md:flex lg:-right-8">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <AtSign className="size-4" />
        </span>
        <span className="text-left text-xs leading-tight">
          <span className="block font-semibold">새 멘션 알림</span>
          <span className="block text-muted-foreground">@지민 님이 회원님을 언급</span>
        </span>
      </div>
    </div>
  );
}

/** 브라우저 프레임 내부 — 앱 상단 툴바 + 칸반 3열. */
function KanbanMockup() {
  return (
    <div className="bg-background p-3 sm:p-5">
      {/* 앱 툴바: 화면 제목 + 뷰 전환 탭(목록/칸반/타임라인) + 검색/작성 버튼 흉내. */}
      <div className="mb-4 flex items-center gap-2">
        <span className="truncate text-sm font-semibold">IT부문 진행업무</span>
        <div className="ml-auto flex items-center gap-1 rounded-md border bg-muted/50 p-0.5">
          {VIEW_TABS.map((tab) => (
            <span
              key={tab}
              className={cn(
                "rounded px-2 py-1 text-[10px] leading-none",
                // 칸반 탭만 선택된 상태로 그린다(아래 본문이 칸반이므로).
                tab === "칸반"
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {tab}
            </span>
          ))}
        </div>
        <span className="hidden size-7 items-center justify-center rounded-md border text-muted-foreground sm:flex">
          <Search className="size-3.5" />
        </span>
        <span className="hidden items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-medium text-primary-foreground sm:flex">
          <Plus className="size-3" />
          진행업무 등록
        </span>
      </div>

      {/* 칸반 3열. 아주 좁은 화면에서는 3열이 읽히지 않으므로 완료 열을 숨긴다. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {COLUMNS.map((column, columnIndex) => (
          <div
            key={column.title}
            className={cn(
              "flex flex-col gap-2 rounded-lg bg-muted/40 p-2",
              columnIndex === 2 && "hidden sm:flex",
            )}
          >
            <div className="flex items-center gap-1.5 px-1 py-0.5">
              <span className={cn("size-1.5 rounded-full", column.dotClass)} aria-hidden="true" />
              <span className="text-[11px] font-medium">{column.title}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{column.count}</span>
            </div>
            {column.cards.map((card) => (
              <MockKanbanCard key={card.title} card={card} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 칸반 카드 한 장 — 제목 · 업무타입 배지 · 진척률 바 · 작성자 아바타. */
function MockKanbanCard({ card }: { card: MockCard }) {
  const avatar = getAvatarPreset(card.avatarKey);

  return (
    <div className="rounded-md border bg-card p-2 shadow-sm">
      <p className="line-clamp-2 text-[11px] font-medium leading-snug">{card.title}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="rounded border px-1 py-px text-[9px] text-muted-foreground">
          {card.workType}
        </span>
        {card.overdue ? (
          <span className="rounded bg-destructive/10 px-1 py-px text-[9px] font-medium text-destructive">
            지연
          </span>
        ) : null}
      </div>
      {/* 진척률 바: 실제 Progress 컴포넌트 대신 div 2개로 그린다(목업이라 상태가 없음). */}
      <div className="mt-2 flex items-center gap-1.5">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full",
              card.progress === 100 ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${card.progress}%` }}
          />
        </div>
        <span className="text-[9px] tabular-nums text-muted-foreground">{card.progress}%</span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span
          className={cn(
            "flex size-4 items-center justify-center rounded-full text-[9px]",
            avatar.bgClass,
          )}
          aria-hidden="true"
        >
          {avatar.emoji}
        </span>
        <span className="text-[9px] text-muted-foreground">~ 09.30</span>
      </div>
    </div>
  );
}
