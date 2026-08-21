import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
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
// 클릭 시 이동하는 목록 링크는 정확도가 서로 다르다 — weekly_logs의 기존 필터 축(department/
// status/from/to)은 "기간이 겹치는 항목" 검색용으로 설계돼 있어 "목표종료일이 특정 값보다
// 이전/이후"라는 조건을 직접 표현할 수 없다(status 필터도 단일 값만 가능해 "완료 아님"을
// 표현할 수 없음). 그래서:
//   - "진행중" → author+status=in_progress 조합이 RPC의 in_progress_count와 정확히
//     일치한다(날짜 조건이 없는 단순 집계라 기존 필터로 완전히 표현 가능).
//   - "지연" → 칸반보드(author로 좁힌 뷰)로 보낸다. 칸반 카드의 빨간 "지연" 표시가 이 RPC와
//     동일한 조건이므로, 목록 페이지의 근사 필터보다 정확하다(실측: status=in_progress만으로
//     좁히면 이 프로젝트 시드 데이터 기준 지연 203건 중 69건(planned 상태)이 누락된다).
//   - "이번 주 마감" → author+status=in_progress+from=todayIso로 근사한다. from은 목표종료일
//     하한(>=todayIso)만 정확히 표현하고 상한(주 종료일 이하)은 표현할 수 없어, 이번 주보다
//     늦게 마감인 진행중 업무도 함께 보일 수 있다 — 기존 필터 축만으로는 상한을 표현할 방법이
//     없어 발생하는 알려진 근사치다(Task 040 범위는 author 축 신설까지이므로 별도의 "마감
//     상한" 필터 신설은 이번 작업 범위 밖으로 남겨둔다).
export function MyWorkSummaryWidget({
  summary,
  authorId,
  todayIso,
}: {
  summary: MyWorkSummary;
  authorId: string;
  todayIso: string;
}) {
  const items: {
    key: string;
    label: string;
    count: number;
    href: string;
    caption: string;
  }[] = [
    {
      key: "overdue",
      label: "지연",
      count: summary.overdue_count,
      href: `/protected/weekly-logs/kanban?department=${ALL_DEPARTMENTS_FILTER}&author=${authorId}`,
      caption: "완료되지 않고 목표종료일이 지난 내 업무",
    },
    {
      key: "due_this_week",
      label: "이번 주 마감",
      count: summary.due_this_week_count,
      href: `/protected/weekly-logs?department=${ALL_DEPARTMENTS_FILTER}&status=in_progress&author=${authorId}&from=${todayIso}`,
      caption: "완료되지 않고 이번 주(월~일)에 마감인 내 업무",
    },
    {
      key: "in_progress",
      label: "진행중",
      count: summary.in_progress_count,
      href: `/protected/weekly-logs?department=${ALL_DEPARTMENTS_FILTER}&status=in_progress&author=${authorId}`,
      caption: "현재 진행중 상태인 내 업무",
    },
  ];

  return (
    <Card>
      <CardContent className="grid grid-cols-1 divide-y p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((item) => {
          const disabled = item.count === 0;
          const content = (
            <div
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-4 text-center transition-colors",
                disabled
                  ? "text-muted-foreground"
                  : "hover:bg-muted/50 cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  disabled ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {item.count.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-sm">{item.label}</span>
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
