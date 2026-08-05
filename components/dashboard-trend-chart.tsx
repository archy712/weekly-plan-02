"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/empty-state";
import { TREND_CHART_COLORS } from "@/lib/constants/chart-colors";
import type { MonthlyLogTrend } from "@/lib/types/stats";

const chartConfig: ChartConfig = {
  created_count: { label: "생성", color: TREND_CHART_COLORS.created },
  completed_count: { label: "완료", color: TREND_CHART_COLORS.completed },
};

// "YYYY-MM-DD" -> "M월" (축 라벨용, 모바일에서 겹치지 않도록 짧게 표시).
function formatMonthTick(value: string): string {
  const month = Number(value.slice(5, 7));
  return `${month}월`;
}

// 월별 생성·완료 추이(선형). completed_count는 target_end_date 기준 근사치다(Task 030 —
// weekly_logs에 별도의 "완료 처리 시각" 컬럼이 없기 때문). 부서 필터는 반영되지만
// 대시보드의 기간(from/to) 필터는 반영되지 않는다 — 이 차트는 "최근 N개월 추이"가
// 목적이라 stats_logs_monthly_trend가 months 파라미터로 별도 범위를 계산한다.
export function DashboardTrendChart({ data }: { data: MonthlyLogTrend[] }) {
  const isEmpty =
    data.length === 0 ||
    data.every((row) => row.created_count === 0 && row.completed_count === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>월별 추이</CardTitle>
        <CardDescription>
          최근 {data.length || 6}개월 신규 생성 대비 완료 건수입니다(완료는 완료 예정일 기준
          근사치).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            title="집계할 업무일지가 없습니다"
            description="최근 기간에 등록되거나 완료된 주간업무일지가 없습니다."
          />
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-72 w-full"
              role="img"
              aria-label="월별 신규 생성 건수와 완료 건수 추이 선형 그래프"
            >
              <LineChart data={data} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatMonthTick}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(v) => formatMonthTick(String(v))} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="created_count"
                  stroke="var(--color-created_count)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="completed_count"
                  stroke="var(--color-completed_count)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>월별 신규 생성·완료 건수 추이</caption>
              <thead>
                <tr>
                  <th scope="col">월</th>
                  <th scope="col">생성</th>
                  <th scope="col">완료</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.month}>
                    <th scope="row">{row.month.slice(0, 7)}</th>
                    <td>{row.created_count}</td>
                    <td>{row.completed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
