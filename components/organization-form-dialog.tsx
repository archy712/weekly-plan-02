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
import {
  createOrganizationAction,
  updateOrganizationAction,
} from "@/lib/actions/organization";
import { organizationSchema, type OrganizationFormData } from "@/lib/schemas/organization";

type OrganizationFormDialogProps =
  | {
      mode: "create";
      trigger: React.ReactNode;
    }
  | {
      mode: "edit";
      trigger: React.ReactNode;
      organization: { id: string; name: string };
    };

// department-form-dialog.tsx와 동일한 추가/수정 겸용 다이얼로그 패턴.
export function OrganizationFormDialog(props: OrganizationFormDialogProps) {
  const { mode, trigger } = props;
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const defaultName = mode === "edit" ? props.organization.name : "";

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: defaultName },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset({ name: defaultName });
    }
  };

  const handleSubmit = async (values: OrganizationFormData) => {
    const result =
      mode === "create"
        ? await createOrganizationAction(values)
        : await updateOrganizationAction(props.organization.id, values);

    if (!result.success) {
      form.setError("name", { message: result.error });
      return;
    }

    toast.success(mode === "create" ? "조직이 추가되었습니다." : "조직명이 수정되었습니다.");
    setOpen(false);
    router.refresh();
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "조직 추가" : "조직명 수정"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "새 조직명을 입력해주세요."
              : "조직명을 수정합니다. 헤더 타이틀과 소속 부서 화면에 즉시 반영됩니다."}
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
