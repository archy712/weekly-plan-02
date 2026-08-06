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
import { updateOrganizationAction } from "@/lib/actions/organization";
import { organizationSchema, type OrganizationFormData } from "@/lib/schemas/organization";

// 관리자는 자기 소속 조직 1건만 관리할 수 있어(새 조직 생성 경로 없음) 이 다이얼로그는
// 항상 이름 수정 전용이다.
export function OrganizationFormDialog({
  organization,
  trigger,
}: {
  organization: { id: string; name: string };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: organization.name },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset({ name: organization.name });
    }
  };

  const handleSubmit = async (values: OrganizationFormData) => {
    const result = await updateOrganizationAction(organization.id, values);

    if (!result.success) {
      form.setError("name", { message: result.error });
      return;
    }

    toast.success("조직명이 수정되었습니다.");
    setOpen(false);
    router.refresh();
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>조직명 수정</DialogTitle>
          <DialogDescription>
            조직명을 수정합니다. 헤더 타이틀과 소속 부서 화면에 즉시 반영됩니다.
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
