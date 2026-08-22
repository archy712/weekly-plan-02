import { z } from "zod";

import { NONE_SELECT_VALUE } from "@/lib/constants/select";

export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "부문명을 입력해주세요")
    .max(50, "부문명은 최대 50자까지 입력 가능합니다"),
  // 부문장은 선택 사항이고, DB 트리거(validate_organization_head)가 이 부문 소속(=이 부문에
  // 속한 팀의 팀원)인지 최종 검증한다 — NONE_SELECT_VALUE 또는 실제 프로필 uuid만 허용한다.
  head_profile_id: z.union([z.literal(NONE_SELECT_VALUE), z.string().uuid()]),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
