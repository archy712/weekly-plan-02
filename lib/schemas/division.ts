import { z } from "zod";

import { NONE_SELECT_VALUE } from "@/lib/constants/select";

export const divisionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "부서명을 입력해주세요")
    .max(50, "부서명은 최대 50자까지 입력 가능합니다"),
  // 부서는 반드시 부문 하위에 속해야 한다(DB organization_id NOT NULL과 동일한 제약).
  organization_id: z.string().uuid("소속 부문을 선택해주세요"),
  // 부서장은 선택 사항이고, DB 트리거(validate_division_head)가 이 부서 소속(=이 부서에 속한
  // 팀의 팀원)인지 최종 검증한다 — NONE_SELECT_VALUE 또는 실제 프로필 uuid만 허용한다.
  head_profile_id: z.union([z.literal(NONE_SELECT_VALUE), z.string().uuid()]),
});

export type DivisionFormData = z.infer<typeof divisionSchema>;
