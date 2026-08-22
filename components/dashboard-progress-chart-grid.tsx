"use client";

import { Cell, Pie, PieChart } from "recharts";

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

function ProgressMiniPie({ row }: { row: ProgressGroupStats }) {
  const total = row.total_count;
  const counts: Record<WeeklyLogProgressBucket, number> = {
    good: row.good_count,
    delayed: row.delayed_count,
    unregistered: row.unregistered_count,
  };
  const data = BUCKETS.map((bucket) => ({ bucket, value: counts[bucket] }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="truncate text-sm font-medium" title={row.name}>
          {row.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 pb-4">
        <ChartContainer
          config={chartConfig}
          className="aspect-square w-full max-h-36"
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
              innerRadius={26}
              outerRadius={44}
              paddingAngle={2}
              strokeWidth={1}
              label={({ midAngle, innerRadius: inner, outerRadius: outer, percent, cx, cy }) => {
                if (!percent || percent < 0.08 || midAngle == null) return null;
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
                    className="fill-white text-[10px] font-semibold"
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
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          {data.map((d) => {
            const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div key={d.bucket} className="flex items-center gap-1">
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-[2px]"
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

export function DashboardProgressChartGrid({
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((row) => (
            <ProgressMiniPie key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
