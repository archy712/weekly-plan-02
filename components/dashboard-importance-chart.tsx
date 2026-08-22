"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/empty-state";
import { IMPORTANCE_CHART_COLOR } from "@/lib/constants/chart-colors";
import { formatImportanceLabel } from "@/lib/constants/importance";
import type { ImportanceLogStats } from "@/lib/types/stats";

const chartConfig: ChartConfig = {
  log_count: { label: "건수", color: IMPORTANCE_CHART_COLOR },
};

// 업무 중요도 분포(레이더). stats_logs_by_importance는 데이터가 0건인 단계도 항상 5개
// 축으로 반환하도록 설계되어 있어(진행상태·업무 타입 차트와 동일한 원칙), 필터 조건에
// 따라 축 모양이 흔들리지 않는다. 5단계는 순서가 있는 척도라 항상 1→5 순서로 그린다.
export function DashboardImportanceChart({ data }: { data: ImportanceLogStats[] }) {
  const total = data.reduce((sum, row) => sum + row.log_count, 0);
  const isEmpty = total === 0;
  const sorted = [...data].sort((a, b) => a.importance - b.importance);
  const chartData = sorted.map((row) => ({
    ...row,
    level: formatImportanceLabel(row.importance),
  }));
  const maxCount = Math.max(1, ...sorted.map((row) => row.log_count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>업무 중요도 분포</CardTitle>
        <CardDescription>
          업무 중요도(매우 낮음~매우 높음 5단계)별 주간업무일지 건수입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            title="집계할 업무일지가 없습니다"
            description="선택한 팀·기간에 등록된 주간업무일지가 없습니다."
          />
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-96"
              role="img"
              aria-label="업무 중요도별 주간업무일지 건수 레이더 그래프"
            >
              <RadarChart
                data={chartData}
                outerRadius="65%"
                margin={{ top: 24, right: 32, bottom: 24, left: 32 }}
              >
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="level"
                      formatter={(value, _name, item) => {
                        const row = item.payload as (typeof chartData)[number];
                        const numericValue = typeof value === "number" ? value : Number(value);
                        const percent = total > 0 ? Math.round((numericValue / total) * 100) : 0;
                        return (
                          <div className="flex w-full items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: IMPORTANCE_CHART_COLOR }}
                            />
                            <div className="flex flex-1 items-center justify-between gap-4">
                              <span className="text-muted-foreground">{row.level}</span>
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
                <PolarGrid />
                <PolarAngleAxis dataKey="level" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis
                  angle={90}
                  allowDecimals={false}
                  domain={[0, maxCount]}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  dataKey="log_count"
                  stroke={IMPORTANCE_CHART_COLOR}
                  fill={IMPORTANCE_CHART_COLOR}
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>업무 중요도별 업무일지 건수 및 비율</caption>
              <thead>
                <tr>
                  <th scope="col">업무 중요도</th>
                  <th scope="col">건수</th>
                  <th scope="col">비율</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.importance}>
                    <th scope="row">{row.level}</th>
                    <td>{row.log_count}</td>
                    <td>{total > 0 ? Math.round((row.log_count / total) * 100) : 0}%</td>
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
