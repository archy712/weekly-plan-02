"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { GallerySection } from "@/components/component-gallery/gallery-section";

const TREND_DATA = [
  { month: "1월", signups: 45, visitors: 186 },
  { month: "2월", signups: 78, visitors: 305 },
  { month: "3월", signups: 62, visitors: 237 },
  { month: "4월", signups: 55, visitors: 273 },
  { month: "5월", signups: 70, visitors: 209 },
  { month: "6월", signups: 90, visitors: 214 },
];

const trendConfig = {
  signups: { label: "가입자", color: "hsl(var(--chart-1))" },
  visitors: { label: "방문자", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const DEVICE_DATA = [
  { device: "desktop", value: 62, fill: "hsl(var(--chart-1))" },
  { device: "mobile", value: 28, fill: "hsl(var(--chart-2))" },
  { device: "tablet", value: 10, fill: "hsl(var(--chart-3))" },
];

const deviceConfig = {
  desktop: { label: "데스크톱", color: "hsl(var(--chart-1))" },
  mobile: { label: "모바일", color: "hsl(var(--chart-2))" },
  tablet: { label: "태블릿", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const SATISFACTION_DATA = [
  { level: "매우 만족", value: 38, fill: "hsl(var(--chart-1))" },
  { level: "만족", value: 34, fill: "hsl(var(--chart-2))" },
  { level: "보통", value: 20, fill: "hsl(var(--chart-3))" },
  { level: "불만족", value: 8, fill: "hsl(var(--chart-4))" },
];

const satisfactionConfig = {
  value: { label: "응답 비율" },
  "매우 만족": { label: "매우 만족", color: "hsl(var(--chart-1))" },
  만족: { label: "만족", color: "hsl(var(--chart-2))" },
  보통: { label: "보통", color: "hsl(var(--chart-3))" },
  불만족: { label: "불만족", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const RADAR_DATA = [
  { skill: "기획", score: 80 },
  { skill: "개발", score: 92 },
  { skill: "디자인", score: 65 },
  { skill: "커뮤니케이션", score: 74 },
  { skill: "테스트", score: 58 },
];

const radarConfig = {
  score: { label: "점수", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const SCATTER_DATA = [
  { price: 12, rating: 2.1 },
  { price: 28, rating: 3.4 },
  { price: 35, rating: 4.8 },
  { price: 48, rating: 3.9 },
  { price: 60, rating: 6.2 },
  { price: 72, rating: 5.1 },
  { price: 88, rating: 7.4 },
  { price: 95, rating: 6.8 },
];

const scatterConfig = {
  rating: { label: "평점", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

function ChartCategoryLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
    >
      {label}
      <Badge variant="secondary" className="font-normal">
        {count}
      </Badge>
    </a>
  );
}

export function ChartsTab() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        <ChartCategoryLink href="#chart-category-trend" label="추세 & 시계열" count={3} />
        <ChartCategoryLink href="#chart-category-proportion" label="비율 & 구성비" count={3} />
        <ChartCategoryLink href="#chart-category-comparison" label="비교 & 상관관계" count={2} />
      </div>

      <div className="flex flex-col gap-4">
        <h3 id="chart-category-trend" className="scroll-mt-20 text-base font-semibold">
          추세 & 시계열
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <GallerySection
            title="Bar Chart"
            description="월별 방문자 · 가입자 비교"
            contentClassName="sm:grid-cols-1"
          >
            <ChartContainer config={trendConfig} className="max-h-[220px] w-full">
              <BarChart accessibilityLayer data={TREND_DATA}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="signups" fill="var(--color-signups)" radius={4} />
                <Bar dataKey="visitors" fill="var(--color-visitors)" radius={4} />
              </BarChart>
            </ChartContainer>
          </GallerySection>

          <GallerySection
            title="Line Chart"
            description="추세를 선으로 표현"
            contentClassName="sm:grid-cols-1"
          >
            <ChartContainer config={trendConfig} className="max-h-[220px] w-full">
              <LineChart accessibilityLayer data={TREND_DATA}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="signups" stroke="var(--color-signups)" strokeWidth={2} dot={false} />
                <Line dataKey="visitors" stroke="var(--color-visitors)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </GallerySection>

          <GallerySection
            title="Area Chart"
            description="누적 영역으로 방문자 추이 표현"
            contentClassName="sm:grid-cols-1"
          >
            <ChartContainer config={trendConfig} className="max-h-[220px] w-full">
              <AreaChart accessibilityLayer data={TREND_DATA}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  dataKey="signups"
                  stackId="a"
                  fill="var(--color-signups)"
                  stroke="var(--color-signups)"
                  fillOpacity={0.4}
                />
                <Area
                  dataKey="visitors"
                  stackId="a"
                  fill="var(--color-visitors)"
                  stroke="var(--color-visitors)"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ChartContainer>
          </GallerySection>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 id="chart-category-proportion" className="scroll-mt-20 text-base font-semibold">
          비율 & 구성비
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <GallerySection
            title="Pie Chart"
            description="기기별 세션 비중"
            contentClassName="sm:grid-cols-1"
          >
            <ChartContainer config={deviceConfig} className="mx-auto max-h-[220px] aspect-square">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={DEVICE_DATA} dataKey="value" nameKey="device" />
              </PieChart>
            </ChartContainer>
          </GallerySection>

          <GallerySection
            title="Donut Chart"
            description="만족도 응답 비율"
            contentClassName="sm:grid-cols-1"
          >
            <ChartContainer config={satisfactionConfig} className="mx-auto max-h-[220px] aspect-square">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={SATISFACTION_DATA} dataKey="value" nameKey="level" innerRadius={45} />
                <ChartLegend content={<ChartLegendContent nameKey="level" />} />
              </PieChart>
            </ChartContainer>
          </GallerySection>

          <GallerySection
            title="Radial Bar Chart"
            description="기기별 세션 수를 방사형 막대로 표현"
            contentClassName="sm:grid-cols-1"
          >
            <ChartContainer config={deviceConfig} className="mx-auto max-h-[220px] aspect-square">
              <RadialBarChart
                data={DEVICE_DATA}
                innerRadius={20}
                outerRadius={90}
              >
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <RadialBar dataKey="value" background />
                <ChartLegend content={<ChartLegendContent nameKey="device" />} />
              </RadialBarChart>
            </ChartContainer>
          </GallerySection>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 id="chart-category-comparison" className="scroll-mt-20 text-base font-semibold">
          비교 & 상관관계
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GallerySection
            title="Radar Chart"
            description="역량 항목별 점수"
            contentClassName="sm:grid-cols-1"
          >
            <ChartContainer config={radarConfig} className="mx-auto max-h-[250px] aspect-square">
              <RadarChart data={RADAR_DATA}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <PolarAngleAxis dataKey="skill" />
                <PolarGrid />
                <PolarRadiusAxis domain={[0, 100]} tickCount={5} axisLine={false} />
                <Radar
                  dataKey="score"
                  fill="var(--color-score)"
                  fillOpacity={0.6}
                  dot={{ r: 4, fillOpacity: 1 }}
                />
              </RadarChart>
            </ChartContainer>
          </GallerySection>

          <GallerySection
            title="Scatter Chart"
            description="가격과 평점의 상관관계"
            contentClassName="sm:grid-cols-1"
          >
            <ChartContainer config={scatterConfig} className="max-h-[250px] w-full">
              <ScatterChart>
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="price"
                  name="가격"
                  unit="천원"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis type="number" dataKey="rating" name="평점" tickLine={false} axisLine={false} />
                <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
                <Scatter data={SCATTER_DATA} fill="var(--color-rating)" />
              </ScatterChart>
            </ChartContainer>
          </GallerySection>
        </div>
      </div>
    </div>
  );
}
