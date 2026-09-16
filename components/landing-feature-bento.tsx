import {
  Bell,
  BellRing,
  Bookmark,
  Building2,
  CalendarRange,
  FileDown,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Paperclip,
  Save,
  ShieldCheck,
  ThumbsUp,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

// 랜딩 "주요 기능" 섹션 — 모든 카드를 같은 크기로 나열하면 17개가 균일하게 늘어서
// 단조로워지므로, 대표 기능 3개만 2칸을 차지하는 큰 카드로 두고 미니 시각화를 곁들이는
// 벤토(bento) 그리드로 구성한다. 나머지는 1칸짜리 압축 카드다.
//
// 그리드는 lg에서 4열이며, 아래 FEATURES 배열의 순서와 span 값이 곧 화면 배치다
// (span: 2인 항목 3개가 각 행의 리듬을 만드는 구조라 순서를 바꿀 때는 한 행이 4칸으로
// 딱 떨어지는지 확인할 것 — 2+2 / 1+1+1+1 / 2+1+1 / 1+1+1+1 / 1+1+1+1 = 17개).
//
// 각 기능의 실제 구현 위치는 CLAUDE.md의 해당 절을 참고.

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** lg 화면에서 차지할 열 수. 2면 미니 시각화를 곁들인 큰 카드. */
  span: 1 | 2;
  /** span: 2인 카드에만 그리는 미니 시각화. */
  visual?: "chart" | "progress" | "comments";
};

const FEATURES: Feature[] = [
  {
    icon: LayoutDashboard,
    title: "통계 대시보드",
    description:
      "팀별·기간별·상태별·업무타입별·중요도별 집계를 차트로 시각화해 팀 현황을 데이터로 파악합니다.",
    span: 2,
    visual: "chart",
  },
  {
    icon: Gauge,
    title: "진척률 관리",
    description:
      "0~100% 진척률을 기록하면 목표종료일 기준 목표진척률과 자동 비교되어, 지연 여부를 바로 확인할 수 있습니다.",
    span: 2,
    visual: "progress",
  },
  {
    icon: Building2,
    title: "부문·부서·팀 계층",
    description:
      "부문 → 부서 → 팀 3단 계층으로 조직을 관리하고 각 단위의 장을 지정합니다.",
    span: 1,
  },
  {
    icon: CalendarRange,
    title: "타임라인 뷰",
    description:
      "시작일부터 목표종료일까지 시간축 위에 배치해 전체 일정 흐름을 파악합니다.",
    span: 1,
  },
  {
    icon: FileText,
    title: "리치 텍스트 진행업무",
    description:
      "서식 편집기로 내용을 작성하고 기간·진행 상태까지 한 화면에서 기록합니다.",
    span: 1,
  },
  {
    icon: ListChecks,
    title: "업무 타입·중요도 분류",
    description:
      "업무 타입(다중 선택)과 1~5단계 중요도로 업무의 우선순위를 분류합니다.",
    span: 1,
  },
  {
    icon: MessagesSquare,
    title: "댓글·멘션 협업",
    description:
      "타 팀 업무에도 댓글과 대댓글을 남기고 @멘션으로 담당자를 호출해 함께 논의하세요.",
    span: 2,
    visual: "comments",
  },
  {
    icon: Bell,
    title: "실시간 알림",
    description:
      "멘션·댓글·답글이 달리면 실시간으로 알려 중요한 요청을 놓치지 않습니다.",
    span: 1,
  },
  {
    icon: UserCheck,
    title: "내 업무 요약 위젯",
    description:
      "지연·이번 주 마감·진행중 건수를 목록에 들어가는 즉시 확인합니다.",
    span: 1,
  },
  {
    icon: FileDown,
    title: "PDF·Excel 다운로드",
    description:
      "조회 중인 목록을 한글 서식이 유지되는 PDF·Excel로 그대로 내려받습니다.",
    span: 1,
  },
  {
    icon: Paperclip,
    title: "첨부파일 & 빠른 검색",
    description:
      "파일을 첨부하고 제목·내용·기간 검색으로 원하는 기록을 바로 찾아냅니다.",
    span: 1,
  },
  {
    icon: ThumbsUp,
    title: "추천·비추천",
    description:
      "부서와 무관하게 어떤 진행업무에도 반응을 남기고 현황을 집계합니다.",
    span: 1,
  },
  {
    icon: ShieldCheck,
    title: "관리자 콘솔",
    description:
      "부문·부서·팀·사용자·업무 타입을 한 콘솔에서 통합 관리합니다.",
    span: 1,
  },
  {
    icon: Save,
    title: "작성 중 임시저장",
    description:
      "페이지를 벗어나도 작성 중이던 내용이 자동 저장되어 그대로 복원됩니다.",
    span: 1,
  },
  {
    icon: BellRing,
    title: "정기 리마인더",
    description:
      "미작성 진행업무를 알려주고, 알림은 유형별로 켜고 끌 수 있습니다.",
    span: 1,
  },
  {
    icon: History,
    title: "변경 이력 추적",
    description:
      "상태·업무 타입·중요도가 언제 누구에 의해 바뀌었는지 되짚어봅니다.",
    span: 1,
  },
  {
    icon: Bookmark,
    title: "필터 프리셋 저장",
    description:
      "자주 쓰는 필터 조합을 저장해 목록·칸반에서 한 번에 다시 적용합니다.",
    span: 1,
  },
];

export function LandingFeatureBento() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((feature) => (
        <article
          key={feature.title}
          className={cn(
            // group: 호버 시 아이콘 칩 색이 함께 반응하도록 하는 스코프.
            "group relative flex flex-col overflow-hidden rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg",
            feature.span === 2 &&
              "bg-gradient-to-br from-card to-muted/50 sm:col-span-2",
          )}
        >
          <span className="mb-3 flex size-9 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <feature.icon className="size-[18px]" />
          </span>
          <h3 className="text-sm font-semibold">{feature.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {feature.description}
          </p>
          {feature.visual ? (
            <div className="mt-4 flex-1">
              <FeatureVisual kind={feature.visual} />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

/** span: 2 카드에만 들어가는 미니 시각화. 전부 장식이라 aria-hidden 처리한다. */
function FeatureVisual({ kind }: { kind: NonNullable<Feature["visual"]> }) {
  if (kind === "chart") {
    // 막대 높이는 고정 상수(랜덤 아님) — 렌더마다 모양이 흔들리지 않게 한다.
    const bars = [38, 62, 46, 84, 70, 52, 92];
    return (
      <div aria-hidden="true" className="flex h-16 items-end gap-2.5 px-0.5">
        {bars.map((height, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 rounded-t-md",
              // 마지막(최신) 막대만 진하게 강조해 "증가 추세"를 읽히게 한다.
              index === bars.length - 1 ? "bg-foreground/70" : "bg-foreground/10",
            )}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    );
  }

  if (kind === "progress") {
    const rows = [
      { label: "대시보드 개편", value: 72, target: 60 },
      { label: "계약서 개정", value: 45, target: 80 },
      { label: "반응형 QA", value: 30, target: 25 },
    ];
    return (
      <div aria-hidden="true" className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-[11px] text-muted-foreground">
              {row.label}
            </span>
            {/* 바 위의 세로선이 "목표진척률" 눈금 — 실제 화면의 비교 개념을 축약해 보여준다. */}
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  row.value < row.target ? "bg-destructive" : "bg-success",
                )}
                style={{ width: `${row.value}%` }}
              />
              <span
                className="absolute inset-y-0 w-px bg-foreground/40"
                style={{ left: `${row.target}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
              {row.value}%
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <div className="max-w-[85%] rounded-lg rounded-tl-sm border bg-background px-3 py-2 text-[11px] leading-snug">
        <span className="font-medium text-primary">@지민</span> 이 건 일정 조정
        가능할까요?
      </div>
      <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-3 py-2 text-[11px] leading-snug text-primary-foreground">
        네, 다음 주까지 목표종료일 변경해둘게요.
      </div>
    </div>
  );
}
