import { z } from "zod";

import { NONE_SELECT_VALUE } from "@/lib/constants/select";

// 부서(division) 미배정을 표현하는 sentinel 값(lib/constants/select.ts 참고).
export const NO_DIVISION_VALUE = NONE_SELECT_VALUE;

export const departmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "팀명을 입력해주세요")
    .max(50, "팀명은 최대 50자까지 입력 가능합니다"),
  // 팀은 반드시 부문 하위에 속해야 한다(DB organization_id NOT NULL과 동일한 제약).
  organization_id: z.string().uuid("소속 부문을 선택해주세요"),
  // 부서(division)는 부문과 팀 사이의 선택적 계층이라 없어도 된다(DB division_id nullable과
  // 동일한 제약) — NO_DIVISION_VALUE 또는 실제 부서 uuid만 허용한다.
  division_id: z.union([z.literal(NO_DIVISION_VALUE), z.string().uuid()]),
  // 팀장은 선택 사항이고, DB 트리거(validate_department_head)가 이 팀 소속 팀원인지 최종
  // 검증한다 — NONE_SELECT_VALUE 또는 실제 프로필 uuid만 허용한다.
  head_profile_id: z.union([z.literal(NONE_SELECT_VALUE), z.string().uuid()]),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;
