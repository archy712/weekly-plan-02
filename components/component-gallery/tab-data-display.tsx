"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { GallerySection } from "@/components/component-gallery/gallery-section";

const INVOICES = [
  { invoice: "INV001", status: "완료", method: "카드", amount: "₩250,000" },
  { invoice: "INV002", status: "대기", method: "계좌이체", amount: "₩150,000" },
  { invoice: "INV003", status: "미결제", method: "카드", amount: "₩350,000" },
];

const VISIT_DATA = [
  { month: "1월", visitors: 186 },
  { month: "2월", visitors: 305 },
  { month: "3월", visitors: 237 },
  { month: "4월", visitors: 273 },
  { month: "5월", visitors: 209 },
  { month: "6월", visitors: 214 },
];

const visitChartConfig = {
  visitors: {
    label: "방문자",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function DataDisplayTab() {
  return (
    <div className="flex flex-col gap-6">
      <GallerySection title="Table" description="정형 데이터 표시" contentClassName="sm:grid-cols-1">
        <Table>
          <TableCaption>최근 발행된 인보이스 목록입니다.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>인보이스</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>결제수단</TableHead>
              <TableHead className="text-right">금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INVOICES.map((invoice) => (
              <TableRow key={invoice.invoice}>
                <TableCell className="font-medium">{invoice.invoice}</TableCell>
                <TableCell>{invoice.status}</TableCell>
                <TableCell>{invoice.method}</TableCell>
                <TableCell className="text-right">{invoice.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GallerySection>

      <GallerySection title="Avatar" description="사용자 아바타" contentClassName="sm:grid-cols-1">
        <div className="flex items-center gap-6">
          <Avatar>
            <AvatarFallback>SK</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>V3</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>B</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
        </div>
      </GallerySection>

      <GallerySection title="Chart" description="recharts 기반 차트" contentClassName="sm:grid-cols-1">
        <ChartContainer config={visitChartConfig} className="max-h-[220px] w-full max-w-md">
          <BarChart accessibilityLayer data={VISIT_DATA}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="visitors" fill="var(--color-visitors)" radius={4} />
          </BarChart>
        </ChartContainer>
      </GallerySection>

      <GallerySection
        title="Carousel"
        description="좌우로 넘기는 콘텐츠"
        contentClassName="sm:grid-cols-1"
      >
        <Carousel className="w-full max-w-xs">
          <CarouselContent>
            {Array.from({ length: 5 }).map((_, index) => (
              <CarouselItem key={index}>
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="text-4xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </GallerySection>
    </div>
  );
}
