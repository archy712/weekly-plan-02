"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";

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
import { REACTION_CHART_COLORS } from "@/lib/constants/chart-colors";
import type { WeeklyLogReactionKind } from "@/lib/types";
import type { ReactionSummaryStats } from "@/lib/types/stats";

const REACTION_LABELS: Record<WeeklyLogReactionKind, string> = {
  up: "추천",
  down: "비추천",
};

const chartConfig: ChartConfig = {
  reaction_count: { label: "건수", color: REACTION_CHART_COLORS.up },
};

// 추천/비추천 합계(세로 막대, F031). stats_reactions_summary는 데이터가 0건인 반응도 항상
// up/down 2개 행으로 반환해(다른 대시보드 차트와 동일 원칙) 필터에 따라 막대 개수가 흔들리지
// 않는다. 1인 1표라 두 막대는 서로 다른 사용자·업무일지 조합의 건수 합계다.
export function DashboardReactionChart({ data }: { data: ReactionSummaryStats[] }) {
  const total = data.reduce((sum, row) => sum + row.reaction_count, 0);
  const isEmpty = total === 0;
  // 항상 추천 → 비추천 순으로 그린다.
  const ordered = [...data].sort((a, b) => (a.reaction === "up" ? -1 : 1));
  const chartData = ordered.map((row) => ({
    reaction: row.reaction,
    label: REACTION_LABELS[row.reaction],
    reaction_count: row.reaction_count,
  }));
  const upCount = chartData.find((row) => row.reaction === "up")?.reaction_count ?? 0;
  const downCount = chartData.find((row) => row.reaction === "down")?.reaction_count ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>추천/비추천</CardTitle>
        <CardDescription>
          선택한 팀·기간 진행업무에 달린 추천/비추천 합계입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            title="집계할 반응이 없습니다"
            description="선택한 팀·기간에 등록된 추천/비추천이 없습니다."
          />
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-auto h-72 w-full"
              role="img"
              aria-label={`추천/비추천 막대 그래프. 추천 ${upCount}건, 비추천 ${downCount}건`}
            >
              <BarChart data={chartData} margin={{ top: 24, left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis type="number" allowDecimals={false} width={32} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="label"
                      formatter={(value, _name, item) => {
                        const row = item.payload as {
                          reaction: WeeklyLogReactionKind;
                          label: string;
                          reaction_count: number;
                        };
                        const numericValue = typeof value === "number" ? value : Number(value);
                        return (
                          <div className="flex w-full items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: REACTION_CHART_COLORS[row.reaction] }}
                            />
                            <div className="flex flex-1 items-center justify-between gap-4">
                              <span className="text-muted-foreground">{row.label}</span>
                              <span className="font-mono font-medium text-foreground tabular-nums">
                                {numericValue.toLocaleString()}건
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="reaction_count" radius={[4, 4, 0, 0]} maxBarSize={96}>
                  {chartData.map((row) => (
                    <Cell key={row.reaction} fill={REACTION_CHART_COLORS[row.reaction]} />
                  ))}
                  <LabelList
                    dataKey="reaction_count"
                    position="top"
                    className="fill-foreground text-xs font-medium"
                    formatter={(value) => Number(value).toLocaleString()}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>추천/비추천 건수</caption>
              <thead>
                <tr>
                  <th scope="col">반응</th>
                  <th scope="col">건수</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.reaction}>
                    <th scope="row">{row.label}</th>
                    <td>{row.reaction_count}</td>
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
