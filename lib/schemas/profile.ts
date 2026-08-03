import { z } from "zod";

export const profileSchema = z.object({
  department_id: z.string().uuid("부서를 선택해주세요"),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
