import { z } from "zod";

export const divisionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "부서명을 입력해주세요")
    .max(50, "부서명은 최대 50자까지 입력 가능합니다"),
  // 부서는 반드시 부문 하위에 속해야 한다(DB organization_id NOT NULL과 동일한 제약).
  organization_id: z.string().uuid("소속 부문을 선택해주세요"),
});

export type DivisionFormData = z.infer<typeof divisionSchema>;
