import { z } from "zod";

// 부서(division) 미배정을 표현하는 sentinel 값. Radix Select는 빈 문자열을 값으로 허용하지
// 않아("" 은 선택 해제 표시로 예약됨) division_id가 optional column(nullable)이어도 폼
// 값으로는 이 문자열을 쓰고, 서버 액션에서 null로 변환한다.
export const NO_DIVISION_VALUE = "none";

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
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;
