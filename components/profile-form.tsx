"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { AvatarPickerDialog } from "@/components/avatar-picker-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/database.types";
import type { AvatarKey } from "@/lib/constants/avatars";
import { formatPhoneNumberInput } from "@/lib/utils";
import { profileSchema, type ProfileFormData } from "@/lib/schemas/profile";

type Profile = Pick<
  Tables<"profiles">,
  "id" | "email" | "department_id" | "phone_number" | "avatar_key" | "bio"
>;
type Department = Pick<Tables<"departments">, "id" | "name" | "archived_at">;

export function ProfileForm({
  profile,
  departments,
  className,
  ...props
}: {
  profile: Profile;
  departments: Department[];
} & React.ComponentPropsWithoutRef<"div">) {
  const [error, setError] = useState<string | null>(null);
  const isFirstTimeSetup = !profile.department_id;

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      department_id: profile.department_id ?? "",
      phone_number: profile.phone_number ?? "",
      avatar_key: (profile.avatar_key as AvatarKey) ?? "fox",
      bio: profile.bio ?? "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const handleSubmit = async (values: ProfileFormData) => {
    const supabase = createClient();
    setError(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          department_id: values.department_id,
          phone_number: values.phone_number || null,
          avatar_key: values.avatar_key,
          bio: values.bio || null,
        })
        .eq("id", profile.id);
      if (error) throw error;

      const departmentName =
        departments.find((department) => department.id === values.department_id)
          ?.name ?? "선택한 부서";
      toast.success(
        isFirstTimeSetup
          ? `${departmentName}으로 설정되었습니다.`
          : "프로필이 저장되었습니다.",
      );

      // 토스트가 잠깐 보인 뒤 목록 화면으로 이동
      setTimeout(() => {
        window.location.href = "/protected/weekly-logs";
      }, 900);
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "프로필 저장 중 오류가 발생했습니다.",
      );
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">프로필</CardTitle>
          <CardDescription>프로필 정보를 입력해주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col gap-6"
            >
              {!profile.department_id && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  부서를 선택해야 서비스 이용이 가능합니다.
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" value={profile.email ?? ""} disabled />
              </div>
              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>부서</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="부서를 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.archived_at
                              ? `${department.name} (비활성)`
                              : department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>전화번호</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder="010-1234-5678"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(formatPhoneNumberInput(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatar_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>아바타</FormLabel>
                    <FormControl>
                      <AvatarPickerDialog value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>자기소개</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="간단한 자기소개를 입력해주세요."
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "저장 중..." : "저장"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
