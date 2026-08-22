"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import type { LabelProps } from "recharts";

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

// 스택 막대 세그먼트 위에 "해당 부서 합계 대비 이 상태의 비율"을 표시한다. 세그먼트가
// 너무 좁으면(부서 로그 수가 적을 때) 텍스트가 겹치므로 폭이 24px 미만이면 숨긴다.
function renderStackedPercentLabel(data: DepartmentLogStats[]) {
  return function StackedPercentLabel(props: LabelProps) {
    const { x, y, width, height, value, index } = props;
    if (typeof index !== "number" || typeof width !== "number" || width < 24) {
      return null;
    }
    const row = data[index];
    const numericValue = typeof value === "number" ? value : Number(value);
    if (!row || !numericValue) {
      return null;
    }
    const percent = row.total_count > 0 ? Math.round((numericValue / row.total_count) * 100) : 0;
    if (percent <= 0) {
      return null;
    }
    const cx = (typeof x === "number" ? x : 0) + width / 2;
    const cy = (typeof y === "number" ? y : 0) + (typeof height === "number" ? height : 0) / 2;
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white text-[10px] font-medium"
      >
        {percent}%
      </text>
    );
  };
}

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
        <CardTitle>팀별 건수</CardTitle>
        <CardDescription>
          진행상태별로 쌓아 표시합니다. 팀 필터와 무관하게 전체 팀을 비교합니다.
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
              aria-label="팀별 예정·진행중·완료 건수를 쌓아 올린 가로 막대 그래프"
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
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => {
                        const row = item.payload as DepartmentLogStats;
                        const key = name as keyof typeof chartConfig;
                        const label = chartConfig[key]?.label ?? name;
                        const color = chartConfig[key]?.color;
                        const numericValue = typeof value === "number" ? value : Number(value);
                        const percent =
                          row.total_count > 0 ? Math.round((numericValue / row.total_count) * 100) : 0;
                        return (
                          <div className="flex w-full items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: color }}
                            />
                            <div className="flex flex-1 items-center justify-between gap-4">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-mono font-medium text-foreground tabular-nums">
                                {numericValue.toLocaleString()}건 ({percent}%)
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="planned_count"
                  stackId="status"
                  fill="var(--color-planned_count)"
                  radius={[0, 0, 0, 0]}
                >
                  <LabelList dataKey="planned_count" content={renderStackedPercentLabel(data)} />
                </Bar>
                <Bar
                  dataKey="in_progress_count"
                  stackId="status"
                  fill="var(--color-in_progress_count)"
                  radius={[0, 0, 0, 0]}
                >
                  <LabelList dataKey="in_progress_count" content={renderStackedPercentLabel(data)} />
                </Bar>
                <Bar
                  dataKey="completed_count"
                  stackId="status"
                  fill="var(--color-completed_count)"
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList dataKey="completed_count" content={renderStackedPercentLabel(data)} />
                </Bar>
              </BarChart>
            </ChartContainer>
            {/* 스크린리더용 표 대체 콘텐츠(MVP Task 015의 aria-label 누락 전례 반영) */}
            <table className="sr-only">
              <caption>팀별 진행상태별 업무일지 건수 및 팀 내 비율</caption>
              <thead>
                <tr>
                  <th scope="col">팀</th>
                  <th scope="col">예정</th>
                  <th scope="col">진행중</th>
                  <th scope="col">완료</th>
                  <th scope="col">합계</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const pct = (count: number) =>
                    row.total_count > 0 ? Math.round((count / row.total_count) * 100) : 0;
                  return (
                    <tr key={row.department_id}>
                      <th scope="row">{row.department_name}</th>
                      <td>
                        {row.planned_count}건 ({pct(row.planned_count)}%)
                      </td>
                      <td>
                        {row.in_progress_count}건 ({pct(row.in_progress_count)}%)
                      </td>
                      <td>
                        {row.completed_count}건 ({pct(row.completed_count)}%)
                      </td>
                      <td>{row.total_count}건</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
