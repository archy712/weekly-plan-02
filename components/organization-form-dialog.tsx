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
import { Input } from "@/components/ui/input";
import { createOrganizationAction, updateOrganizationAction } from "@/lib/actions/organization";
import { organizationSchema, type OrganizationFormData } from "@/lib/schemas/organization";

// 일반 관리자는 자기 소속 조직 1건만 관리할 수 있어(수정 전용) organization prop을
// 넘겨받는다. 슈퍼관리자는 새 조직을 생성할 수도 있어(organizations_insert_superadmin
// RLS 정책) organization을 생략하면 이 다이얼로그가 생성 모드로 동작한다.
export function OrganizationFormDialog({
  organization,
  trigger,
}: {
  organization?: { id: string; name: string };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditMode = Boolean(organization);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: organization?.name ?? "" },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset({ name: organization?.name ?? "" });
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

    toast.success(isEditMode ? "조직명이 수정되었습니다." : "조직이 생성되었습니다.");
    setOpen(false);
    router.refresh();
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "조직명 수정" : "새 조직 생성"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "조직명을 수정합니다. 헤더 타이틀과 소속 팀 화면에 즉시 반영됩니다."
              : "새 조직을 생성합니다. 팀 배정 등 후속 설정은 direct DB 접속으로 진행해주세요."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>조직명</FormLabel>
                  <FormControl>
                    <Input placeholder="예: IT부문" maxLength={50} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
