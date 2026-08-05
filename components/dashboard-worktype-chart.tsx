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
import { WORK_TYPE_CHART_COLORS } from "@/lib/constants/chart-colors";
import type { WorkTypeLogStats } from "@/lib/types/stats";

const chartConfig: ChartConfig = {
  log_count: { label: "건수", color: WORK_TYPE_CHART_COLORS[0] },
};

// 소수점 1자리 퍼센트 문자열("12.3%"). 건수와 마찬가지로 3자리 이상이면 콤마가 필요하지만
// 비율은 0~100 범위라 실질적으로 콤마가 붙을 일은 없다 — toLocaleString으로 두 표시를 통일한다.
function formatPercent(count: number, total: number) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return `${percent.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

// 업무 타입별 건수(가로 막대). stats_logs_by_work_type은 데이터가 0건인 타입도 항상 8개
// 행으로 반환하도록 설계되어 있어(진행상태 분포 차트와 동일한 원칙), 필터 조건에 따라
// 막대 개수가 흔들리지 않는다. 부서별 건수 차트와 달리 상태로 스택하지 않는 단일 계열이라
// 값이 큰 순서로 정렬해야 한눈에 비교하기 쉽다(작성 폼의 선택지 순서는 가나다순을 쓰지만,
// 이 차트는 "어떤 타입이 많은지" 비교가 목적이라 건수 내림차순을 그대로 유지).
export function DashboardWorkTypeChart({ data }: { data: WorkTypeLogStats[] }) {
  const total = data.reduce((sum, row) => sum + row.log_count, 0);
  const isEmpty = total === 0;
  const sorted = [...data].sort((a, b) => b.log_count - a.log_count);
  const chartHeight = Math.max(200, sorted.length * 36);

  return (
    <Card>
      <CardHeader>
        <CardTitle>업무 타입별 건수</CardTitle>
        <CardDescription>
          업무 타입(네트워크·클라우드·보안 등)별 주간업무일지 건수입니다. 하나의
          업무일지가 여러 타입에 속할 수 있어 비율 합계가 100%를 넘을 수 있습니다.
        </CardDescription>
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
              className="aspect-auto w-full"
              style={{ height: chartHeight }}
              role="img"
              aria-label="업무 타입별 주간업무일지 건수 가로 막대 그래프"
            >
              <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 32 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="work_type"
                  width={88}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="work_type"
                      formatter={(value, _name, item, index) => {
                        const row = item.payload as WorkTypeLogStats;
                        const numericValue = typeof value === "number" ? value : Number(value);
                        const color =
                          WORK_TYPE_CHART_COLORS[
                            Number(index) % WORK_TYPE_CHART_COLORS.length
                          ];
                        return (
                          <div className="flex w-full items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: color }}
                            />
                            <div className="flex flex-1 items-center justify-between gap-4">
                              <span className="text-muted-foreground">{row.work_type}</span>
                              <span className="font-mono font-medium text-foreground tabular-nums">
                                {numericValue.toLocaleString()}건 ({formatPercent(numericValue, total)})
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="log_count" radius={[0, 4, 4, 0]}>
                  {sorted.map((row, index) => (
                    <Cell
                      key={row.work_type}
                      fill={WORK_TYPE_CHART_COLORS[index % WORK_TYPE_CHART_COLORS.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="log_count"
                    position="insideRight"
                    className="fill-white text-xs font-medium"
                    formatter={(value) => {
                      const numericValue = Number(value);
                      if (numericValue <= 0) return "";
                      return `${numericValue.toLocaleString()}건, ${formatPercent(numericValue, total)}`;
                    }}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>업무 타입별 업무일지 건수 및 비율</caption>
              <thead>
                <tr>
                  <th scope="col">업무 타입</th>
                  <th scope="col">건수</th>
                  <th scope="col">비율</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.work_type}>
                    <th scope="row">{row.work_type}</th>
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
