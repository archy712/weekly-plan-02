"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { HeadProfileCombobox } from "@/components/head-profile-combobox";
import { Input } from "@/components/ui/input";
import { createOrganizationAction, updateOrganizationAction } from "@/lib/actions/organization";
import { NONE_SELECT_VALUE } from "@/lib/constants/select";
import { organizationSchema, type OrganizationFormData } from "@/lib/schemas/organization";
import type { HeadCandidate } from "@/lib/types";

// 일반 관리자는 자기 소속 조직 1건만 관리할 수 있어(수정 전용) organization prop을
// 넘겨받는다. 슈퍼관리자는 새 조직을 생성할 수도 있어(organizations_insert_superadmin
// RLS 정책) organization을 생략하면 이 다이얼로그가 생성 모드로 동작한다.
export function OrganizationFormDialog({
  organization,
  headCandidates,
  trigger,
}: {
  organization?: { id: string; name: string; head_profile_id: string | null };
  // 부문장 후보 — 새로 만드는 부문은 아직 소속 팀/팀원이 없어 생성 모드에는 넘기지 않는다.
  headCandidates?: HeadCandidate[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditMode = Boolean(organization);

  const defaultHeadProfileId = organization?.head_profile_id ?? NONE_SELECT_VALUE;

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: organization?.name ?? "", head_profile_id: defaultHeadProfileId },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset({ name: organization?.name ?? "", head_profile_id: defaultHeadProfileId });
    }
  };

  const handleSubmit = async (values: OrganizationFormData) => {
    const result = organization
      ? await updateOrganizationAction(organization.id, values)
      : await createOrganizationAction(values);

    if (!result.success) {
      form.setError("name", { message: result.error });
      return;
    }

    toast.success(isEditMode ? "부문명이 수정되었습니다." : "부문이 생성되었습니다.");
    setOpen(false);
    router.refresh();
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "부문명 수정" : "새 부문 생성"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "부문명·부문장을 수정합니다. 헤더 타이틀과 소속 팀 화면에 즉시 반영됩니다."
              : "새 부문을 생성합니다. 팀 배정 등 후속 설정은 direct DB 접속으로 진행해주세요."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>부문명</FormLabel>
                  <FormControl>
                    <Input placeholder="예: IT부문" maxLength={50} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEditMode && (
              <FormField
                control={form.control}
                name="head_profile_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>부문장</FormLabel>
                    <FormControl>
                      <HeadProfileCombobox
                        candidates={headCandidates ?? []}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="팀원 이름 또는 이메일로 검색"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
