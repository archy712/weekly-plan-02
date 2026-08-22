"use client";

import type { Control } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { ProfileFormData } from "@/lib/schemas/profile";

/**
 * 알림 구독 설정 스위치 3종(댓글·멘션·리마인더).
 *
 * - "댓글" 스위치는 대댓글 알림도 함께 제어한다(별도 컬럼 없이 notify_on_comment를 따르는
 *   DB 트리거 매핑, Task 042 참고) — 캡션으로 이 매핑을 사용자에게 명시한다.
 * - "리마인더" 스위치는 Task 044(pg_cron)의 `create_weekly_log_reminders()`가 매주 금요일
 *   15:00 KST에 이 값을 직접 조회해 알림 생성 여부를 결정한다(`notify_on_reminder = true`인
 *   사용자만 대상). Task 043 시점엔 값만 저장했으나 이제 실제로 소비된다.
 */
export function NotificationPreferencesField({
  control,
}: {
  control: Control<ProfileFormData>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-medium">알림 설정</h3>
        <p className="text-sm text-muted-foreground">
          받고 싶은 알림 유형을 선택하세요. 끈 알림은 이후부터 생성되지 않습니다.
        </p>
      </div>
      <FormField
        control={control}
        name="notify_on_comment"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">댓글 알림</FormLabel>
              <FormDescription>
                내 진행업무에 댓글이 달리면 알림을 받습니다. 대댓글 알림도 이 설정을
                따릅니다.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="notify_on_mention"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">멘션 알림</FormLabel>
              <FormDescription>
                댓글에서 나를 @멘션하면 알림을 받습니다.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="notify_on_reminder"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">작성 리마인더</FormLabel>
              <FormDescription>
                이번 주 진행업무를 아직 작성하지 않았을 때 알림을 받습니다.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
