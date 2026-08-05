"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateUserRoleAction } from "@/lib/actions/user-admin";
import type { UserRole } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  user: "일반 사용자",
  admin: "관리자",
};

const ROLE_OPTIONS: UserRole[] = ["user", "admin"];

// 목록의 인라인 셀렉트와 상세 페이지의 역할 변경 폼이 공유하는 컨트롤.
// weekly-log-detail-view.tsx의 진행상태 변경(handleStatusChange)과 동일하게
// 낙관적 업데이트 → 서버 액션 → 실패 시 롤백 + 토스트 패턴을 따른다.
export function UserRoleSelect({
  userId,
  role,
  disabled = false,
  disabledReason,
  className,
  onChanged,
}: {
  userId: string;
  role: UserRole;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  onChanged?: (role: UserRole) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState<UserRole>(role);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (next: string) => {
    const nextRole = next as UserRole;
    const previous = value;
    if (nextRole === previous) return;

    setValue(nextRole);
    setIsUpdating(true);
    try {
      const result = await updateUserRoleAction(userId, nextRole);
      if (!result.success) {
        setValue(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`${ROLE_LABELS[nextRole]}(으)로 변경되었습니다. 재로그인 없이 즉시 반영됩니다.`);
      onChanged?.(nextRole);
      router.refresh();
    } catch {
      setValue(previous);
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select
      value={value}
      disabled={disabled || isUpdating}
      onValueChange={handleChange}
    >
      <SelectTrigger
        className={cn("w-32", className)}
        aria-label="역할"
        title={disabled ? disabledReason : undefined}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {ROLE_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
