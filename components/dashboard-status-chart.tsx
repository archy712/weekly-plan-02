"use client";

import { Cell, Label, Pie, PieChart } from "recharts";

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
import { getStatusLabel } from "@/lib/format";
import type { StatusLogStats } from "@/lib/types/stats";

const chartConfig: ChartConfig = {
  planned: { label: "예정", color: STATUS_CHART_COLORS.planned },
  in_progress: { label: "진행중", color: STATUS_CHART_COLORS.in_progress },
  completed: { label: "완료", color: STATUS_CHART_COLORS.completed },
};

// 진행상태 분포(도넛). stats_logs_by_status는 데이터가 0건인 상태도 항상 3개 행으로
// 반환하도록 설계되어 있어(Task 030), 범례가 조건에 따라 흔들리지 않는다.
export function DashboardStatusChart({ data }: { data: StatusLogStats[] }) {
  const total = data.reduce((sum, row) => sum + row.log_count, 0);
  const isEmpty = total === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>진행상태 분포</CardTitle>
        <CardDescription>선택한 부서·기간의 예정/진행중/완료 비율입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            title="집계할 업무일지가 없습니다"
            description="선택한 부서·기간에 등록된 주간업무일지가 없습니다."
          />
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-72"
              role="img"
              aria-label={`진행상태 분포 도넛 그래프. 전체 ${total}건 중 예정 ${
                data.find((row) => row.status === "planned")?.log_count ?? 0
              }건, 진행중 ${
                data.find((row) => row.status === "in_progress")?.log_count ?? 0
              }건, 완료 ${data.find((row) => row.status === "completed")?.log_count ?? 0}건`}
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                <Pie
                  data={data}
                  dataKey="log_count"
                  nameKey="status"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={2}
                >
                  {data.map((row) => (
                    <Cell key={row.status} fill={STATUS_CHART_COLORS[row.status]} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || viewBox.cx == null) {
                        return null;
                      }
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-semibold"
                          >
                            {total.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            전체 건수
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>진행상태별 업무일지 건수</caption>
              <thead>
                <tr>
                  <th scope="col">진행상태</th>
                  <th scope="col">건수</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.status}>
                    <th scope="row">{getStatusLabel(row.status)}</th>
                    <td>{row.log_count}</td>
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
