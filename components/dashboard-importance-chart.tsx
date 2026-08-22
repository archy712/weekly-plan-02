"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/empty-state";
import { IMPORTANCE_CHART_COLORS } from "@/lib/constants/chart-colors";
import { formatImportanceLabel } from "@/lib/constants/importance";
import { cn } from "@/lib/utils";
import type { ImportanceLogStats } from "@/lib/types/stats";

const chartConfig: ChartConfig = {
  log_count: { label: "건수", color: IMPORTANCE_CHART_COLORS[IMPORTANCE_CHART_COLORS.length - 1] },
};

// 막대 두께를 고정값으로 못박아, 카드가 옆 카드(업무 타입 분포)만큼 늘어나도 그 여유
// 높이가 막대를 굵게 만드는 대신 단계와 단계 사이 간격으로 쓰이도록 한다
// (dashboard-department-chart.tsx와 동일한 패턴).
const BAR_THICKNESS = 28;

// 옅은 배경(낮은 단계)에는 어두운 글자, 짙은 배경(높은 단계)에는 흰 글자를 써야 대비가
// 유지된다 — IMPORTANCE_CHART_COLORS 인덱스가 이 임계값 미만이면 옅은 배경으로 취급.
const DARK_TEXT_THRESHOLD_INDEX = 2;

// 막대 안쪽에 "N건, NN%" 라벨을 그린다. 단계별로 배경 짙기가 달라 텍스트 색을 한
// className으로 통일할 수 없어(업무 타입 차트와 차이점) LabelList content로 직접 그린다.
function renderImportanceLabel(total: number) {
  return function ImportanceLabel(props: LabelProps) {
    const { x, y, width, height, value, index } = props;
    if (typeof index !== "number" || typeof width !== "number" || typeof x !== "number") {
      return null;
    }
    const numericValue = typeof value === "number" ? value : Number(value);
    if (!numericValue) {
      return null;
    }
    const percent = total > 0 ? Math.round((numericValue / total) * 100) : 0;
    const cy = (typeof y === "number" ? y : 0) + (typeof height === "number" ? height : 0) / 2;
    const isLight = index < DARK_TEXT_THRESHOLD_INDEX;
    return (
      <text
        x={x + width - 10}
        y={cy}
        textAnchor="end"
        dominantBaseline="middle"
        className={cn(
          "text-xs font-medium",
          isLight ? "fill-foreground" : "fill-white",
        )}
      >
        {numericValue.toLocaleString()}건, {percent}%
      </text>
    );
  };
}

// 업무 중요도 분포(가로 막대). 레이더 차트에서 교체됨 — 축이 전부 같은 지표(건수)인
// 단일 순서형 변수(1~5)라 레이더의 "형태" 비교가 무의미하고, 오각형에 순서형 척도를
// 펼쳐놓으면 극단값(매우 낮음·매우 높음)이 오히려 인접해 보이는 착시가 있었다. 막대는
// 각 단계의 건수를 길이로 직접 비교할 수 있어 더 정직하다(업무 타입 차트와 시각 언어 통일).
// stats_logs_by_importance는 데이터가 0건인 단계도 항상 5개 행으로 반환하도록 설계되어
// 있어(진행상태·업무 타입 차트와 동일한 원칙), 필터 조건에 따라 막대 개수가 흔들리지
// 않는다. 1~5는 순서가 있는 척도라 업무 타입 차트처럼 건수 내림차순으로 재정렬하지 않고
// 항상 낮음→높음 순으로 그린다.
export function DashboardImportanceChart({ data }: { data: ImportanceLogStats[] }) {
  const total = data.reduce((sum, row) => sum + row.log_count, 0);
  const isEmpty = total === 0;
  const sorted = [...data].sort((a, b) => a.importance - b.importance);
  const chartData = sorted.map((row) => ({
    ...row,
    level: formatImportanceLabel(row.importance),
  }));
  const chartHeight = Math.max(200, chartData.length * 40);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>업무 중요도 분포</CardTitle>
        <CardDescription>
          업무 중요도(매우 낮음~매우 높음 5단계)별 주간업무일지 건수입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isEmpty ? (
          <EmptyState
            title="집계할 업무일지가 없습니다"
            description="선택한 팀·기간에 등록된 주간업무일지가 없습니다."
          />
        ) : (
          <>
            {/* 옆 카드(업무 타입 분포)가 더 길어 그리드 행이 늘어나도 이 카드 안에 빈
                공간이 남지 않도록 flex-1로 남는 높이를 그대로 흡수한다. 막대 두께는
                barSize로 고정해두어, 늘어난 높이가 막대를 굵게 만드는 대신 단계 사이
                간격으로 쓰이게 한다(dashboard-department-chart.tsx와 동일 패턴). */}
            <ChartContainer
              config={chartConfig}
              className="aspect-auto w-full flex-1"
              style={{ minHeight: chartHeight }}
              role="img"
              aria-label="업무 중요도별 주간업무일지 건수 가로 막대 그래프"
            >
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="level"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="level"
                      formatter={(value, _name, item, index) => {
                        const row = item.payload as (typeof chartData)[number];
                        const numericValue = typeof value === "number" ? value : Number(value);
                        const percent = total > 0 ? Math.round((numericValue / total) * 100) : 0;
                        const color =
                          IMPORTANCE_CHART_COLORS[Number(index) % IMPORTANCE_CHART_COLORS.length];
                        return (
                          <div className="flex w-full items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: color }}
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
                <Bar dataKey="log_count" radius={[0, 4, 4, 0]} barSize={BAR_THICKNESS}>
                  {chartData.map((row, index) => (
                    <Cell
                      key={row.importance}
                      fill={IMPORTANCE_CHART_COLORS[index % IMPORTANCE_CHART_COLORS.length]}
                    />
                  ))}
                  <LabelList dataKey="log_count" content={renderImportanceLabel(total)} />
                </Bar>
              </BarChart>
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
