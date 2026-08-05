"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { STATUS_CHART_COLORS } from "@/lib/constants/chart-colors";
import type { DepartmentLogStats } from "@/lib/types/stats";

const chartConfig: ChartConfig = {
  planned_count: { label: "예정", color: STATUS_CHART_COLORS.planned },
  in_progress_count: { label: "진행중", color: STATUS_CHART_COLORS.in_progress },
  completed_count: { label: "완료", color: STATUS_CHART_COLORS.completed },
};

// 부서별 건수(상태별 스택 가로 막대). 이 RPC(stats_logs_by_department)는 부서 비교가
// 목적이라 dept_id 파라미터가 없다 — 대시보드의 부서 필터와 무관하게 항상 전체 부서를
// 보여준다(기간 필터만 반영). 다른 3개 차트와 동작이 다르므로 캡션으로 명시한다.
export function DashboardDepartmentChart({ data }: { data: DepartmentLogStats[] }) {
  const isEmpty = data.length === 0 || data.every((row) => row.total_count === 0);
  // 막대가 너무 많아지지 않도록 높이를 부서 수에 비례해 계산한다.
  const chartHeight = Math.max(200, data.length * 44);

  return (
    <Card>
      <CardHeader>
        <CardTitle>부서별 건수</CardTitle>
        <CardDescription>
          진행상태별로 쌓아 표시합니다. 부서 필터와 무관하게 전체 부서를 비교합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            title="집계할 업무일지가 없습니다"
            description="선택한 기간에 등록된 주간업무일지가 없습니다."
          />
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto w-full"
              style={{ height: chartHeight }}
              role="img"
              aria-label="부서별 예정·진행중·완료 건수를 쌓아 올린 가로 막대 그래프"
            >
              <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="department_name"
                  width={108}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="planned_count"
                  stackId="status"
                  fill="var(--color-planned_count)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="in_progress_count"
                  stackId="status"
                  fill="var(--color-in_progress_count)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="completed_count"
                  stackId="status"
                  fill="var(--color-completed_count)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
            {/* 스크린리더용 표 대체 콘텐츠(MVP Task 015의 aria-label 누락 전례 반영) */}
            <table className="sr-only">
              <caption>부서별 진행상태별 업무일지 건수</caption>
              <thead>
                <tr>
                  <th scope="col">부서</th>
                  <th scope="col">예정</th>
                  <th scope="col">진행중</th>
                  <th scope="col">완료</th>
                  <th scope="col">합계</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.department_id}>
                    <th scope="row">{row.department_name}</th>
                    <td>{row.planned_count}</td>
                    <td>{row.in_progress_count}</td>
                    <td>{row.completed_count}</td>
                    <td>{row.total_count}</td>
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
