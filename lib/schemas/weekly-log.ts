import { z } from "zod";

export const weeklyLogSchema = z
  .object({
    title: z
      .string()
      .min(1, "제목을 입력해주세요")
      .max(100, "제목은 최대 100자까지 입력 가능합니다"),
    content: z
      .string()
      .min(1, "본문을 입력해주세요")
      .max(5000, "본문은 최대 5000자까지 입력 가능합니다"),
    start_date: z.string().date("올바른 시작일을 입력해주세요"),
    target_end_date: z.string().date("올바른 목표종료일을 입력해주세요"),
  })
  .refine((data) => data.start_date <= data.target_end_date, {
    message: "시작일은 목표종료일보다 늦을 수 없습니다",
    path: ["target_end_date"],
  });

export type WeeklyLogFormData = z.infer<typeof weeklyLogSchema>;
