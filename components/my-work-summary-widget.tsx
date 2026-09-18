import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ALL_DEPARTMENTS_FILTER } from "@/lib/types";
import type { MyWorkSummary } from "@/lib/types/stats";

// Task 040(F040) "내 업무" 개인 요약 위젯.
//
// 각 숫자는 stats_my_work_summary RPC(lib/queries/stats.ts의 getMyWorkSummary)가 반환한
// 값을 그대로 노출한다 — 이 숫자 자체는 칸반보드의 "지연" 판정(weekly-log-kanban-column.tsx:71)
// 과 문자 그대로 동일한 조건으로 계산되어 정확하다(마이그레이션 add_my_work_summary_stats_
// function 주석 참고).
//
// 지표는 진행상태 3분류(예정·진행중·완료) + 지연 4개다. 앞 세 개는 서로 배타적이라 합이 내
// 업무 전체 건수지만, "지연"만은 상태를 가로지르는 조건(완료가 아니면서 목표종료일이 지남)
// 이라 예정·진행중 건수와 일부 겹친다 — 네 숫자를 더하면 전체보다 커질 수 있다는 뜻이다.
//
// 클릭 시 이동하는 목록 링크는 정확도가 서로 다르다 — weekly_logs의 기존 필터 축(department/
// status/from/to)은 "기간이 겹치는 항목" 검색용으로 설계돼 있어 "목표종료일이 특정 값보다
// 이전/이후"라는 조건을 직접 표현할 수 없다(status 필터도 단일 값만 가능해 "완료 아님"을
// 표현할 수 없음). 그래서:
//   - "예정"/"진행중"/"완료" → author+status=<해당 상태> 조합이 RPC의 각 건수와 정확히
//     일치한다(날짜 조건이 없는 단순 집계라 기존 필터로 완전히 표현 가능).
//   - "지연" → 칸반보드(author로 좁힌 뷰)로 보낸다. 칸반 카드의 빨간 "지연" 표시가 이 RPC와
//     동일한 조건이므로, 목록 페이지의 근사 필터보다 정확하다(실측: status=in_progress만으로
//     좁히면 이 프로젝트 시드 데이터 기준 지연 203건 중 69건(planned 상태)이 누락된다).
export function MyWorkSummaryWidget({
  summary,
  authorId,
}: {
  summary: MyWorkSummary;
  authorId: string;
}) {
  const items: {
    key: string;
    label: string;
    count: number;
    href: string;
    caption: string;
  }[] = [
    {
      key: "planned",
      label: "예정",
      count: summary.planned_count,
      href: `/protected/weekly-logs?department=${ALL_DEPARTMENTS_FILTER}&status=planned&author=${authorId}`,
      caption: "아직 시작 전(예정) 상태인 내 업무",
    },
    {
      key: "in_progress",
      label: "진행중",
      count: summary.in_progress_count,
      href: `/protected/weekly-logs?department=${ALL_DEPARTMENTS_FILTER}&status=in_progress&author=${authorId}`,
      caption: "현재 진행중 상태인 내 업무",
    },
    {
      key: "completed",
      label: "완료",
      count: summary.completed_count,
      href: `/protected/weekly-logs?department=${ALL_DEPARTMENTS_FILTER}&status=completed&author=${authorId}`,
      caption: "완료 처리된 내 업무",
    },
    {
      key: "overdue",
      label: "지연",
      count: summary.overdue_count,
      href: `/protected/weekly-logs/kanban?department=${ALL_DEPARTMENTS_FILTER}&author=${authorId}`,
      caption: "완료되지 않고 목표종료일이 지난 내 업무(예정·진행중에 걸쳐 있음)",
    },
  ];

  return (
    <Card className="animate-in fade-in-0 duration-300">
      {/* 이 카드의 숫자(예: "진행중 2")가 바로 아래 필터 영역의 "총 N건"(전 사용자·현재
          필터 기준 목록 건수)과 무관하다는 게 한눈에 안 들어온다는 피드백에 따라, "내 업무"
          라벨을 카드 자체에 항상 노출해 두 숫자가 서로 다른 집계라는 걸 명시한다. */}
      <CardHeader className="border-b p-3 pb-2 sm:p-4 sm:pb-3">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
          내 업무
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-4 divide-x p-0">
        {items.map((item) => {
          const disabled = item.count === 0;
          const content = (
            <div
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-3 text-center transition-colors sm:gap-1 sm:px-4 sm:py-4",
                disabled
                  ? "text-muted-foreground"
                  : "hover:bg-muted/50 cursor-pointer",
              )}
            >
              {/* "지연"은 진행상태 3분류와 달리 조치가 필요한 경고성 지표라, 1건이라도
                  있으면 빨간색으로 구분한다(상세 페이지의 "진척 부진" 문구와 동일한
                  text-destructive). 순서상 마지막 칸으로 밀렸어도 눈에 띄게 하기 위함. */}
              <span
                className={cn(
                  "text-lg font-semibold tabular-nums sm:text-2xl",
                  disabled
                    ? "text-muted-foreground"
                    : item.key === "overdue"
                      ? "text-destructive"
                      : "text-foreground",
                )}
              >
                {item.count.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-xs sm:text-sm">
                {item.label}
              </span>
            </div>
          );

          return disabled ? (
            <div
              key={item.key}
              aria-label={`${item.label}인 내 업무 0건`}
              title={item.caption}
            >
              {content}
            </div>
          ) : (
            <Link
              key={item.key}
              href={item.href}
              aria-label={`${item.label}인 내 업무 ${item.count.toLocaleString()}건`}
              title={item.caption}
            >
              {content}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
