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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createWorkTypeAction,
  updateWorkTypeAction,
} from "@/lib/actions/work-type";
import { workTypeSchema, type WorkTypeFormData } from "@/lib/schemas/work-type";
import type { Organization } from "@/lib/types";

type WorkTypeFormDialogProps = {
  organizations: Organization[];
} & (
  | {
      mode: "create";
      trigger: React.ReactNode;
    }
  | {
      mode: "edit";
      trigger: React.ReactNode;
      workType: { id: string; name: string; organization_id: string };
    }
);

// 업무 타입 추가/수정을 겸하는 다이얼로그. department-form-dialog.tsx와 동일한 패턴 —
// 업무 타입도 부서처럼 반드시 조직 하위에 속하므로 조직 Select를 함께 둔다.
export function WorkTypeFormDialog(props: WorkTypeFormDialogProps) {
  const { mode, trigger, organizations } = props;
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const defaultName = mode === "edit" ? props.workType.name : "";
  // 조직이 1개뿐인 현재 상태에서도 바로 선택된 채로 시작하도록 첫 번째(활성) 조직을 기본값으로.
  const defaultOrganizationId =
    mode === "edit" ? props.workType.organization_id : (organizations[0]?.id ?? "");

  const form = useForm<WorkTypeFormData>({
    resolver: zodResolver(workTypeSchema),
    defaultValues: { name: defaultName, organization_id: defaultOrganizationId },
  });

  // 다이얼로그가 열릴 때마다 최신 초기값으로 리셋한다 — 같은 컴포넌트 인스턴스가
  // (수정 모드의 경우) 매번 다른 업무 타입 행에 대해 트리거될 수 있기 때문.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset({ name: defaultName, organization_id: defaultOrganizationId });
    }
  };

  const handleSubmit = async (values: WorkTypeFormData) => {
    const result =
      mode === "create"
        ? await createWorkTypeAction(values)
        : await updateWorkTypeAction(props.workType.id, values);

    if (!result.success) {
      form.setError("name", { message: result.error });
      return;
    }

    toast.success(mode === "create" ? "업무 타입이 추가되었습니다." : "업무 타입명이 수정되었습니다.");
    setOpen(false);
    router.refresh();
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "업무 타입 추가" : "업무 타입명 수정"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "새 업무 타입명을 입력해주세요."
              : "업무 타입명을 수정합니다. 이 타입을 사용 중인 업무일지에 즉시 반영됩니다."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>업무 타입명</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 네트워크" maxLength={20} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organization_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>소속 부문</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="부문 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizations.map((organization) => (
                        <SelectItem key={organization.id} value={organization.id}>
                          {organization.archived_at
                            ? `${organization.name} (비활성)`
                            : organization.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
