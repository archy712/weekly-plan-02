import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyLogTrend, StatusLogStats } from "@/lib/types/stats";

// 요약 카드 4종 — 전체 로그 수 / 진행중 / 완료율 / 이번 달 신규.
// statusStats(getLogsByStatus)는 부서·기간 필터를 반영하므로 앞 3개 카드는 필터에 따라
// 바뀌지만, "이번 달 신규"는 monthlyTrend의 마지막 항목(현재 달, stats_logs_monthly_trend가
// 항상 오름차순으로 반환하므로 배열의 마지막 = 이번 달)을 사용해 기간 필터와 무관하게
// "이번 달" 자체의 의미를 유지한다(부서 필터는 monthlyTrend 조회 시 이미 반영됨).
export function DashboardSummaryCards({
  statusStats,
  monthlyTrend,
}: {
  statusStats: StatusLogStats[];
  monthlyTrend: MonthlyLogTrend[];
}) {
  const total = statusStats.reduce((sum, row) => sum + row.log_count, 0);
  const inProgress =
    statusStats.find((row) => row.status === "in_progress")?.log_count ?? 0;
  const completed =
    statusStats.find((row) => row.status === "completed")?.log_count ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const thisMonthNew = monthlyTrend.at(-1)?.created_count ?? 0;

  const cards = [
    { label: "전체 로그 수", value: `${total.toLocaleString()}건` },
    { label: "진행중", value: `${inProgress.toLocaleString()}건` },
    { label: "완료율", value: `${completionRate}%` },
    { label: "이번 달 신규", value: `${thisMonthNew.toLocaleString()}건` },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
