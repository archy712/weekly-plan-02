"use client";

import { Cell, Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/empty-state";
import { PROGRESS_CHART_COLORS } from "@/lib/constants/chart-colors";
import { getProgressBucketLabel } from "@/lib/format";
import type { WeeklyLogProgressBucket } from "@/lib/types";

// 대시보드 부문(부서별)/부서(팀별) 진척률 파이 차트(ad hoc) 공용 그리드. 그룹(부서 또는 팀)
// 하나당 파이 1개씩 small multiples로 나열한다 — division/department stats RPC(둘 다
// good/delayed/unregistered 3버킷 카운트) 결과를 이 공통 행 모양으로 변환해 넘기면 된다.
export type ProgressGroupStats = {
  id: string;
  name: string;
  good_count: number;
  delayed_count: number;
  unregistered_count: number;
  total_count: number;
};

const chartConfig: ChartConfig = {
  good: { label: getProgressBucketLabel("good"), color: PROGRESS_CHART_COLORS.good },
  delayed: { label: getProgressBucketLabel("delayed"), color: PROGRESS_CHART_COLORS.delayed },
  unregistered: {
    label: getProgressBucketLabel("unregistered"),
    color: PROGRESS_CHART_COLORS.unregistered,
  },
};

const BUCKETS: WeeklyLogProgressBucket[] = ["good", "delayed", "unregistered"];

// 부서(division) 그리드는 "진행상태 분포"(DashboardStatusChart) 카드와 동일한 크기(dashboard-status-chart.tsx
// 참고 — aspect-square max-h-72, innerRadius 60/outerRadius 90, 중앙에 전체 건수 라벨)로
// 맞추고, 팀(department) 그리드는 개수가 많아 기존의 작은 크기를 유지한다.
type ProgressPieSize = "sm" | "lg";

const SIZE_CONFIG: Record<
  ProgressPieSize,
  {
    chartClassName: string;
    innerRadius: number;
    outerRadius: number;
    strokeWidth: number;
    labelClassName: string;
    minPercentToLabel: number;
    legendClassName: string;
    legendDotClassName: string;
    titleClassName: string;
    showCenterTotal: boolean;
  }
> = {
  sm: {
    chartClassName: "aspect-square w-full max-h-36",
    innerRadius: 26,
    outerRadius: 44,
    strokeWidth: 1,
    labelClassName: "fill-white text-[10px] font-semibold",
    minPercentToLabel: 0.08,
    legendClassName: "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground",
    legendDotClassName: "h-1.5 w-1.5 shrink-0 rounded-[2px]",
    titleClassName: "truncate text-sm font-medium",
    showCenterTotal: false,
  },
  lg: {
    chartClassName: "aspect-square w-full max-h-72",
    innerRadius: 60,
    outerRadius: 90,
    strokeWidth: 2,
    labelClassName: "fill-white text-xs font-semibold",
    minPercentToLabel: 0.05,
    legendClassName: "flex flex-wrap items-center justify-center gap-4 pt-1 text-xs",
    legendDotClassName: "h-2 w-2 shrink-0 rounded-[2px]",
    titleClassName: "truncate text-base font-medium",
    showCenterTotal: true,
  },
};

function ProgressMiniPie({ row, size }: { row: ProgressGroupStats; size: ProgressPieSize }) {
  const total = row.total_count;
  const counts: Record<WeeklyLogProgressBucket, number> = {
    good: row.good_count,
    delayed: row.delayed_count,
    unregistered: row.unregistered_count,
  };
  const data = BUCKETS.map((bucket) => ({ bucket, value: counts[bucket] }));
  const config = SIZE_CONFIG[size];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={config.titleClassName} title={row.name}>
          {row.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 pb-4">
        <ChartContainer
          config={chartConfig}
          className={config.chartClassName}
          role="img"
          aria-label={`${row.name} 진척률 파이 그래프. 전체 ${total}건 중 양호 ${row.good_count}건, 지연 ${row.delayed_count}건, 미등록 ${row.unregistered_count}건`}
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="bucket"
                  formatter={(value, name) => {
                    const bucket = name as WeeklyLogProgressBucket;
                    const numericValue = typeof value === "number" ? value : Number(value);
                    const percent = total > 0 ? Math.round((numericValue / total) * 100) : 0;
                    return (
                      <div className="flex w-full items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: PROGRESS_CHART_COLORS[bucket] }}
                        />
                        <div className="flex flex-1 items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {getProgressBucketLabel(bucket)}
                          </span>
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
            <Pie
              data={data}
              dataKey="value"
              nameKey="bucket"
              innerRadius={config.innerRadius}
              outerRadius={config.outerRadius}
              paddingAngle={2}
              strokeWidth={config.strokeWidth}
              label={({ midAngle, innerRadius: inner, outerRadius: outer, percent, cx, cy }) => {
                if (!percent || percent < config.minPercentToLabel || midAngle == null) return null;
                const RADIAN = Math.PI / 180;
                const radius = inner + (outer - inner) / 2;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={config.labelClassName}
                  >
                    {Math.round(percent * 100)}%
                  </text>
                );
              }}
              labelLine={false}
            >
              {data.map((d) => (
                <Cell key={d.bucket} fill={PROGRESS_CHART_COLORS[d.bucket]} />
              ))}
              {config.showCenterTotal && (
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
              )}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className={config.legendClassName}>
          {data.map((d) => {
            const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div key={d.bucket} className="flex items-center gap-1">
                <div
                  className={config.legendDotClassName}
                  style={{ backgroundColor: PROGRESS_CHART_COLORS[d.bucket] }}
                />
                <span>
                  {getProgressBucketLabel(d.bucket)} {percent}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// 부서(division) 그리드는 한 줄에 2개, 팀(department) 그리드는 한 줄에 4개로 고정 요청받아
// 다른 화면 크기까지 함께 좁아지는 반응형 breakpoint 없이 정적 클래스로 열 개수를 고정한다.
const GRID_COLUMNS_CLASS: Record<2 | 4, string> = {
  2: "grid grid-cols-2 gap-4",
  4: "grid grid-cols-4 gap-4",
};

export function DashboardProgressChartGrid({
  title,
  description,
  rows,
  emptyDescription,
  columns,
  size = "sm",
}: {
  title: string;
  description: string;
  rows: ProgressGroupStats[];
  emptyDescription: string;
  columns: 2 | 4;
  size?: ProgressPieSize;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState title="집계할 업무일지가 없습니다" description={emptyDescription} />
          </CardContent>
        </Card>
      ) : (
        <div className={GRID_COLUMNS_CLASS[columns]}>
          {rows.map((row) => (
            <ProgressMiniPie key={row.id} row={row} size={size} />
          ))}
        </div>
      )}
    </div>
  );
}
