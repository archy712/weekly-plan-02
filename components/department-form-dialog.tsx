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
  createDepartmentAction,
  updateDepartmentAction,
} from "@/lib/actions/department";
import { departmentSchema, type DepartmentFormData } from "@/lib/schemas/department";
import type { Organization } from "@/lib/types";

type DepartmentFormDialogProps = {
  organizations: Organization[];
} & (
  | {
      mode: "create";
      trigger: React.ReactNode;
    }
  | {
      mode: "edit";
      trigger: React.ReactNode;
      department: { id: string; name: string; organization_id: string };
    }
);

// 부서 추가/수정을 겸하는 다이얼로그. AvatarPickerDialog와 달리 이 컴포넌트 자체는
// value/onChange 순수 컴포넌트가 아니라(RHF+Zod 폼과 서버 액션 호출까지 포함) 독립적으로
// 재사용 가능한 단위로 분리했다는 점에서 같은 정신을 따른다.
export function DepartmentFormDialog(props: DepartmentFormDialogProps) {
  const { mode, trigger, organizations } = props;
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const defaultName = mode === "edit" ? props.department.name : "";
  // 조직이 1개뿐인 현재 상태에서도 바로 선택된 채로 시작하도록 첫 번째(활성) 조직을 기본값으로.
  const defaultOrganizationId =
    mode === "edit" ? props.department.organization_id : (organizations[0]?.id ?? "");

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: defaultName, organization_id: defaultOrganizationId },
  });

  // 다이얼로그가 열릴 때마다 최신 초기값으로 리셋한다 — 같은 컴포넌트 인스턴스가
  // (수정 모드의 경우) 매번 다른 부서 행에 대해 트리거될 수 있기 때문.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset({ name: defaultName, organization_id: defaultOrganizationId });
    }
  };

  const handleSubmit = async (values: DepartmentFormData) => {
    const result =
      mode === "create"
        ? await createDepartmentAction(values)
        : await updateDepartmentAction(props.department.id, values);

    if (!result.success) {
      form.setError("name", { message: result.error });
      return;
    }

    toast.success(mode === "create" ? "팀이 추가되었습니다." : "팀명이 수정되었습니다.");
    setOpen(false);
    router.refresh();
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "팀 추가" : "팀명 수정"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "새 팀명과 소속 부문을 입력해주세요."
              : "팀명·소속 부문을 수정합니다. 기존 업무일지와 팀원 화면에 즉시 반영됩니다."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>팀명</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 개발팀" maxLength={50} {...field} />
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
