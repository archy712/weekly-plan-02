import { z } from "zod";

export const departmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "부서명을 입력해주세요")
    .max(50, "부서명은 최대 50자까지 입력 가능합니다"),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;
