import { z } from "zod";

export const weeklyLogSchema = z
  .object({
    title: z
      .string()
      .min(1, "업무명을 입력해주세요")
      .max(100, "업무명은 최대 100자까지 입력 가능합니다"),
    content: z
      .string()
      .min(1, "업무 상세 내용을 입력해주세요")
      .max(5000, "업무 상세 내용은 최대 5000자까지 입력 가능합니다"),
    start_date: z.string().date("올바른 시작일을 입력해주세요"),
    target_end_date: z.string().date("올바른 목표종료일을 입력해주세요"),
    // 세 필드 모두 생략 가능 — 빈 문자열도 허용하고 서버에서 null로 변환한다.
    estimated_mm: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{1,4}(\.\d{1,2})?$/.test(val), {
        message: "예상 소요 M/M은 숫자로 입력해주세요 (예: 1.5)",
      }),
    estimated_cost: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{1,15}$/.test(val), {
        message: "예상 소요 금액은 정수로 입력해주세요",
      }),
    partner_company: z
      .string()
      .max(100, "관련 협력 회사는 최대 100자까지 입력 가능합니다")
      .optional(),
  })
  .refine((data) => data.start_date <= data.target_end_date, {
    message: "시작일은 목표종료일보다 늦을 수 없습니다",
    path: ["target_end_date"],
  });

export type WeeklyLogFormData = z.infer<typeof weeklyLogSchema>;
