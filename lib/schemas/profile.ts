import { z } from "zod";

import { AVATAR_KEYS } from "@/lib/constants/avatars";

export const profileSchema = z.object({
  name: z.string().trim().max(50, "이름은 최대 50자까지 입력 가능합니다").optional(),
  department_id: z.string().uuid("부서를 선택해주세요"),
  phone_number: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{3}-\d{4}-\d{4}$/.test(val), {
      message: "전화번호 형식이 올바르지 않습니다 (예: 010-1234-5678)",
    }),
  avatar_key: z.enum(AVATAR_KEYS),
  bio: z
    .string()
    .max(500, "자기소개는 최대 500자까지 입력 가능합니다")
    .optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
