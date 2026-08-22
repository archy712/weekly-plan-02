"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import type { LabelProps } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/empty-state";
import { PROGRESS_CHART_COLORS } from "@/lib/constants/chart-colors";
import { getProgressBucketLabel } from "@/lib/format";
import type { WeeklyLogProgressBucket } from "@/lib/types";

// 대시보드 부문(부서별)/부서(팀별) 진척률(ad hoc) 공용 차트. division/department stats
// RPC(둘 다 good/delayed/unregistered 3버킷 카운트) 결과를 이 공통 행 모양으로 변환해
// 넘기면 된다.
//
// 그룹(부서 또는 팀)마다 파이를 하나씩 늘어놓던 이전 구성(small multiples)을 100% 누적
// 가로 막대로 교체했다 — 파이 조각의 각도는 사람이 정확히 비교하기 가장 어려운 시각
// 인코딩이라 "어느 그룹이 더 양호한가"를 여러 파이 사이에서 비교하기 어렵고, 바로 옆
// "팀별 건수" 차트가 이미 같은 모양(그룹×3개 상태)의 데이터를 누적 막대로 그리고 있어
// 시각 언어를 통일하는 편이 일관적이다. 막대 길이는 절대 건수가 아니라 그룹별 비율(%)로
// 정규화해(각 행의 합이 항상 100) 로그 수가 적은 그룹과 많은 그룹의 진척률을 공정하게
// 비교할 수 있게 한다 — 절대 건수는 툴팁·범례에서 확인한다.
export type ProgressGroupStats = {
  id: string;
  name: string;
  good_count: number;
  delayed_count: number;
  unregistered_count: number;
  total_count: number;
};

type ProgressChartRow = {
  id: string;
  name: string;
  total_count: number;
  good_count: number;
  delayed_count: number;
  unregistered_count: number;
  good_pct: number;
  delayed_pct: number;
  unregistered_pct: number;
};

const chartConfig: ChartConfig = {
  good_pct: { label: getProgressBucketLabel("good"), color: PROGRESS_CHART_COLORS.good },
  delayed_pct: { label: getProgressBucketLabel("delayed"), color: PROGRESS_CHART_COLORS.delayed },
  unregistered_pct: {
    label: getProgressBucketLabel("unregistered"),
    color: PROGRESS_CHART_COLORS.unregistered,
  },
};

const BUCKET_BY_DATA_KEY: Record<string, WeeklyLogProgressBucket> = {
  good_pct: "good",
  delayed_pct: "delayed",
  unregistered_pct: "unregistered",
};

// 막대 두께 고정값 — dashboard-department-chart.tsx와 동일한 이유로, 카드 높이가 늘어나도
// 그 여유가 막대를 굵게 만드는 대신 그룹 사이 간격으로 쓰이게 한다.
const BAR_THICKNESS = 28;

// 스택 막대 세그먼트 위에 반올림한 정수 퍼센트를 표시한다. 세그먼트가 너무 좁으면
// (12px 미만) 텍스트가 겹치므로 숨긴다 — 값 자체가 이미 %라 dashboard-department-chart.tsx의
// 24px 기준보다 좁은 세그먼트도 많아(예: 미등록 2%) 임계값을 더 낮게 잡았다.
function renderStackedPercentLabel(data: ProgressChartRow[]) {
  return function StackedPercentLabel(props: LabelProps) {
    const { x, y, width, height, value, index } = props;
    if (typeof index !== "number" || typeof width !== "number" || width < 12) {
      return null;
    }
    const row = data[index];
    const numericValue = typeof value === "number" ? value : Number(value);
    if (!row || !numericValue) {
      return null;
    }
    const percent = Math.round(numericValue);
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

export function DashboardProgressChart({
  title,
  description,
  rows,
  emptyDescription,
}: {
  title: string;
  description: string;
  rows: ProgressGroupStats[];
  emptyDescription: string;
}) {
  const chartData: ProgressChartRow[] = rows.map((row) => {
    const total = row.total_count;
    return {
      id: row.id,
      name: row.name,
      total_count: total,
      good_count: row.good_count,
      delayed_count: row.delayed_count,
      unregistered_count: row.unregistered_count,
      good_pct: total > 0 ? (row.good_count / total) * 100 : 0,
      delayed_pct: total > 0 ? (row.delayed_count / total) * 100 : 0,
      unregistered_pct: total > 0 ? (row.unregistered_count / total) * 100 : 0,
    };
  });
  const chartHeight = Math.max(200, chartData.length * 44);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState title="집계할 진행업무가 없습니다" description={emptyDescription} />
        ) : (
          <>
            {/* 이전(작은 도넛 그리드) 버전은 옆 카드(진행상태 분포)와 같은 그리드 행에
                놓여 h-full/flex-1로 그 높이에 맞춰 늘어났지만, 이 막대 차트는 그리드가
                아니라 전체 폭 단독 카드로 배치되므로 h-full/flex-1이 기준으로 삼을
                높이가 없어 recharts ResponsiveContainer가 0×0으로 멈추는 문제가 있었다
                (실측). 고정 높이(style height)만 지정한다. */}
            <ChartContainer
              config={chartConfig}
              className="aspect-auto w-full"
              style={{ height: chartHeight }}
              role="img"
              aria-label={`${title} 100% 누적 가로 막대 그래프`}
            >
              <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={108}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => {
                        const row = item.payload as ProgressChartRow;
                        const bucket = BUCKET_BY_DATA_KEY[name as string];
                        const key = name as keyof typeof chartConfig;
                        const label = chartConfig[key]?.label ?? name;
                        const color = chartConfig[key]?.color;
                        const count =
                          bucket === "good"
                            ? row.good_count
                            : bucket === "delayed"
                              ? row.delayed_count
                              : row.unregistered_count;
                        const numericValue = typeof value === "number" ? value : Number(value);
                        return (
                          <div className="flex w-full items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: color }}
                            />
                            <div className="flex flex-1 items-center justify-between gap-4">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-mono font-medium text-foreground tabular-nums">
                                {count.toLocaleString()}건 ({Math.round(numericValue)}%)
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
                  dataKey="good_pct"
                  stackId="progress"
                  fill="var(--color-good_pct)"
                  radius={[0, 0, 0, 0]}
                  barSize={BAR_THICKNESS}
                >
                  <LabelList dataKey="good_pct" content={renderStackedPercentLabel(chartData)} />
                </Bar>
                <Bar
                  dataKey="delayed_pct"
                  stackId="progress"
                  fill="var(--color-delayed_pct)"
                  radius={[0, 0, 0, 0]}
                  barSize={BAR_THICKNESS}
                >
                  <LabelList dataKey="delayed_pct" content={renderStackedPercentLabel(chartData)} />
                </Bar>
                <Bar
                  dataKey="unregistered_pct"
                  stackId="progress"
                  fill="var(--color-unregistered_pct)"
                  radius={[0, 4, 4, 0]}
                  barSize={BAR_THICKNESS}
                >
                  <LabelList
                    dataKey="unregistered_pct"
                    content={renderStackedPercentLabel(chartData)}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>{title} — 양호/지연/미등록 건수 및 비율</caption>
              <thead>
                <tr>
                  <th scope="col">그룹</th>
                  <th scope="col">양호</th>
                  <th scope="col">지연</th>
                  <th scope="col">미등록</th>
                  <th scope="col">합계</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.name}</th>
                    <td>
                      {row.good_count}건 ({Math.round(row.good_pct)}%)
                    </td>
                    <td>
                      {row.delayed_count}건 ({Math.round(row.delayed_pct)}%)
                    </td>
                    <td>
                      {row.unregistered_count}건 ({Math.round(row.unregistered_pct)}%)
                    </td>
                    <td>{row.total_count}건</td>
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
