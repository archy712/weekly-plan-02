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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDivisionAction, updateDivisionAction } from "@/lib/actions/division";
import { NONE_SELECT_VALUE } from "@/lib/constants/select";
import { divisionSchema, type DivisionFormData } from "@/lib/schemas/division";
import type { HeadCandidate, Organization } from "@/lib/types";

type DivisionFormDialogProps = {
  organizations: Organization[];
} & (
  | {
      mode: "create";
      trigger: React.ReactNode;
    }
  | {
      mode: "edit";
      trigger: React.ReactNode;
      division: { id: string; name: string; organization_id: string; head_profile_id: string | null };
      // 부서장 후보 — 새로 만드는 부서는 아직 소속 팀/팀원이 없어 create 모드에는 없다.
      headCandidates: HeadCandidate[];
    }
);

// 부서 추가/수정을 겸하는 다이얼로그. department-form-dialog.tsx와 동일한 패턴 —
// 부서도 팀처럼 반드시 부문 하위에 속하므로 부문 Select를 함께 둔다.
export function DivisionFormDialog(props: DivisionFormDialogProps) {
  const { mode, trigger, organizations } = props;
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const defaultName = mode === "edit" ? props.division.name : "";
  // 부문이 1개뿐인 현재 상태에서도 바로 선택된 채로 시작하도록 첫 번째(활성) 부문을 기본값으로.
  const defaultOrganizationId =
    mode === "edit" ? props.division.organization_id : (organizations[0]?.id ?? "");
  const defaultHeadProfileId =
    mode === "edit" ? (props.division.head_profile_id ?? NONE_SELECT_VALUE) : NONE_SELECT_VALUE;

  const form = useForm<DivisionFormData>({
    resolver: zodResolver(divisionSchema),
    defaultValues: {
      name: defaultName,
      organization_id: defaultOrganizationId,
      head_profile_id: defaultHeadProfileId,
    },
  });

  // 다이얼로그가 열릴 때마다 최신 초기값으로 리셋한다 — 같은 컴포넌트 인스턴스가
  // (수정 모드의 경우) 매번 다른 부서 행에 대해 트리거될 수 있기 때문.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset({
        name: defaultName,
        organization_id: defaultOrganizationId,
        head_profile_id: defaultHeadProfileId,
      });
    }
  };

  const handleSubmit = async (values: DivisionFormData) => {
    const result =
      mode === "create"
        ? await createDivisionAction(values)
        : await updateDivisionAction(props.division.id, values);

    if (!result.success) {
      form.setError("name", { message: result.error });
      return;
    }

    toast.success(mode === "create" ? "부서가 추가되었습니다." : "부서명이 수정되었습니다.");
    setOpen(false);
    router.refresh();
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "부서 추가" : "부서명 수정"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "새 부서명과 소속 부문을 입력해주세요. 부서장은 부서 생성 후 소속 팀원이 생기면 지정할 수 있습니다."
              : "부서명·소속 부문·부서장을 수정합니다. 이 부서에 속한 팀 화면에 즉시 반영됩니다."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>부서명</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 개발부서" maxLength={50} {...field} />
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
            {mode === "edit" && (
              <FormField
                control={form.control}
                name="head_profile_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>부서장</FormLabel>
                    <FormControl>
                      <HeadProfileCombobox
                        candidates={props.headCandidates}
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
