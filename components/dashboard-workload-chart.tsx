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
import { WORKLOAD_CHART_COLORS } from "@/lib/constants/chart-colors";
import { formatCurrency } from "@/lib/format";

export type DepartmentWorkload = {
  department_id: string;
  department_name: string;
  mm_sum: number;
  mm_count: number;
  cost_sum: number;
  cost_count: number;
};

const mmChartConfig: ChartConfig = {
  mm_sum: { label: "예상 M/M", color: WORKLOAD_CHART_COLORS[0] },
};

const costChartConfig: ChartConfig = {
  cost_sum: { label: "예상 금액", color: WORKLOAD_CHART_COLORS[0] },
};

// 큰 금액을 축·막대 라벨에 그대로 찍으면 자리를 너무 많이 차지하므로 백만/억 2개 단위로
// 축약한다. Intl.NumberFormat의 compact notation은 1억 미만을 "만" 단위로 표기해(예:
// 1500만원) 요청받은 "백만/억 2단위"와 맞지 않아 직접 구현. 1억 미만은 백만원 단위
// 정수로, 1억 이상은 억원 단위로 소수 1자리까지 표기하며, 두 경우 모두 세 자리 이상이면
// toLocaleString이 자동으로 콤마를 넣는다(예: 1,234.5억원).
function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 100_000_000) {
    const eok = value / 100_000_000;
    return `${eok.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`;
  }
  const million = Math.round(value / 1_000_000);
  return `${million.toLocaleString("ko-KR")}백만원`;
}

// 부서별 예상 M/M·금액(막대, 2종). stats_workload_summary는 부서별 그룹화 없이 단일
// 행 요약만 반환하므로(Task 030), "부서별" 비교를 위해 페이지에서 부서마다 개별 호출한
// 결과를 조합해 전달받는다. 부서 필터와 무관하게 항상 전체 부서를 비교한다(부서별 건수
// 차트와 동일한 이유).
export function DashboardWorkloadChart({ data }: { data: DepartmentWorkload[] }) {
  const isEmpty = data.every((row) => row.mm_count === 0 && row.cost_count === 0);
  const chartHeight = Math.max(180, data.length * 40);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>부서별 예상 M/M·금액</CardTitle>
        <CardDescription>
          예상 M/M·예상 금액이 입력된 업무일지만 집계한 값입니다(입력하지 않은 항목은
          제외). 부서 필터와 무관하게 전체 부서를 비교합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            title="집계할 데이터가 없습니다"
            description="선택한 기간에 예상 M/M·금액이 입력된 업무일지가 없습니다."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">예상 M/M 합계</p>
                <ChartContainer
                  config={mmChartConfig}
                  className="aspect-auto w-full"
                  style={{ height: chartHeight }}
                  role="img"
                  aria-label="부서별 예상 M/M 합계 가로 막대 그래프"
                >
                  <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
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
                          formatter={(value, _name, item) => (
                            <span>
                              {Number(value).toFixed(1)} M/M ({item.payload.mm_count}건 입력)
                            </span>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="mm_sum" radius={[0, 4, 4, 0]}>
                      {data.map((row, index) => (
                        <Cell
                          key={row.department_id}
                          fill={WORKLOAD_CHART_COLORS[index % WORKLOAD_CHART_COLORS.length]}
                        />
                      ))}
                      <LabelList
                        dataKey="mm_sum"
                        position="right"
                        className="fill-foreground text-xs"
                        formatter={(value) => {
                          const numericValue = Number(value);
                          return numericValue > 0 ? numericValue.toFixed(1) : "";
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">예상 금액 합계</p>
                <ChartContainer
                  config={costChartConfig}
                  className="aspect-auto w-full"
                  style={{ height: chartHeight }}
                  role="img"
                  aria-label="부서별 예상 금액 합계 가로 막대 그래프"
                >
                  <BarChart data={data} layout="vertical" margin={{ left: 8, right: 56 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickFormatter={formatCompactCurrency}
                    />
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
                          formatter={(value, _name, item) => (
                            <span>
                              {formatCurrency(Number(value))} ({item.payload.cost_count}건 입력)
                            </span>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="cost_sum" radius={[0, 4, 4, 0]}>
                      {data.map((row, index) => (
                        <Cell
                          key={row.department_id}
                          fill={WORKLOAD_CHART_COLORS[index % WORKLOAD_CHART_COLORS.length]}
                        />
                      ))}
                      <LabelList
                        dataKey="cost_sum"
                        position="right"
                        className="fill-foreground text-xs"
                        formatter={(value) => {
                          const numericValue = Number(value);
                          return numericValue > 0 ? formatCompactCurrency(numericValue) : "";
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
            <table className="sr-only">
              <caption>부서별 예상 M/M·금액 합계 및 입력 건수</caption>
              <thead>
                <tr>
                  <th scope="col">부서</th>
                  <th scope="col">예상 M/M 합계</th>
                  <th scope="col">M/M 입력 건수</th>
                  <th scope="col">예상 금액 합계</th>
                  <th scope="col">금액 입력 건수</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.department_id}>
                    <th scope="row">{row.department_name}</th>
                    <td>{row.mm_sum}</td>
                    <td>{row.mm_count}</td>
                    <td>{row.cost_sum}</td>
                    <td>{row.cost_count}</td>
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
