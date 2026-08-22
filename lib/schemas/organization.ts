import { z } from "zod";

export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "부문명을 입력해주세요")
    .max(50, "부문명은 최대 50자까지 입력 가능합니다"),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
