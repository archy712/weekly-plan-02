"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Pick<Tables<"profiles">, "id" | "email" | "department_id">;
type Department = Pick<Tables<"departments">, "id" | "name">;

export function ProfileForm({
  profile,
  departments,
  className,
  ...props
}: {
  profile: Profile;
  departments: Department[];
} & React.ComponentPropsWithoutRef<"div">) {
  const [departmentId, setDepartmentId] = useState(profile.department_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ department_id: departmentId })
        .eq("id", profile.id);
      if (error) throw error;
      setSuccess(true);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "부서 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">프로필</CardTitle>
          <CardDescription>소속 부서를 선택해주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {!profile.department_id && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  부서를 선택해야 서비스 이용이 가능합니다.
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" value={profile.email ?? ""} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">부서</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="department" className="w-full">
                    <SelectValue placeholder="부서를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && (
                <p className="text-sm text-green-600">
                  부서가 저장되었습니다.
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !departmentId}
              >
                {isLoading ? "저장 중..." : "저장"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
