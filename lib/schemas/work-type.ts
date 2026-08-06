import { z } from "zod";

export const workTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "업무 타입명을 입력해주세요")
    .max(20, "업무 타입명은 최대 20자까지 입력 가능합니다"),
  // 업무 타입은 반드시 조직 하위에 속해야 한다(DB organization_id NOT NULL과 동일한 제약).
  organization_id: z.string().uuid("소속 조직을 선택해주세요"),
});

export type WorkTypeFormData = z.infer<typeof workTypeSchema>;
