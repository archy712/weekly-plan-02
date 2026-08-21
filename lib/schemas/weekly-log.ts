import { z } from "zod";

import { IMPORTANCE_MAX, IMPORTANCE_MIN } from "@/lib/constants/importance";
import { PROGRESS_MAX, PROGRESS_MIN } from "@/lib/constants/progress";

export const weeklyLogSchema = z
  .object({
    title: z
      .string()
      .min(1, "업무명을 입력해주세요")
      .max(100, "업무명은 최대 100자까지 입력 가능합니다"),
    // 체크박스 다중 선택 — 최소 1개는 선택해야 한다. 허용값은 관리자가 work_types
    // 테이블에서 관리하는 동적 목록이라 컴파일 타임에 알 수 없으므로 여기서는 형태만
    // 검증하고, 실존 여부는 DB 트리거(validate_weekly_log_work_type)가 최종 검증한다.
    work_type: z
      .array(z.string().min(1))
      .min(1, "업무 타입을 1개 이상 선택해주세요"),
    // 슬라이더 1개 값 — 항상 1~5 정수만 들어오므로 min/max만 확인한다.
    importance: z
      .number()
      .int()
      .min(IMPORTANCE_MIN, "업무 중요도를 선택해주세요")
      .max(IMPORTANCE_MAX, "업무 중요도를 선택해주세요"),
    // 슬라이더 1개 값 — 0~100(5 단위)만 들어오므로 min/max만 확인한다. 상세 페이지의
    // 인라인 편집(weekly-log-detail-view.tsx)과 값 범위가 항상 같아야 한다.
    progress: z
      .number()
      .int()
      .min(PROGRESS_MIN, "진척률을 확인해주세요")
      .max(PROGRESS_MAX, "진척률을 확인해주세요"),
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
    // 입력 중 3자리마다 콤마가 자동 삽입되므로(formatThousandsInput), 콤마 포함 형식을
    // 그대로 검증한다 — 서버로 보낼 때(toWeeklyLogPayload)는 콤마를 제거하고 숫자로 변환한다.
    estimated_cost: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{1,3}(,\d{3})*$/.test(val), {
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
