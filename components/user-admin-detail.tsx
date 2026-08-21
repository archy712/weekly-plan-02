"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { UserRoleSelect } from "@/components/user-role-select";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { formatDate, formatDepartmentChangeWarning, getStatusLabel } from "@/lib/format";
import { updateUserDepartmentAction } from "@/lib/actions/user-admin";
import type {
  Department,
  UserAdminDetailData,
  UserAdminLogSummary,
  WeeklyLogStatus,
} from "@/lib/types";

const STATUS_ORDER: WeeklyLogStatus[] = ["planned", "in_progress", "completed"];

export function UserAdminDetail({
  user,
  logSummary,
  departments,
  currentUserId,
}: {
  user: UserAdminDetailData;
  logSummary: UserAdminLogSummary;
  departments: Department[];
  currentUserId: string;
}) {
  const router = useRouter();
  const isSelf = user.id === currentUserId;
  const preset = getAvatarPreset(user.avatar_key);

  // 성공적으로 부서를 바꾼 뒤에도 이 값을 기준으로 "변경" 버튼 활성화 여부를 판단한다
  // (서버 재조회 없이도 같은 값을 다시 고르면 버튼이 비활성화되도록).
  const [appliedDepartmentId, setAppliedDepartmentId] = useState(user.department_id ?? "");
  const [pendingDepartmentId, setPendingDepartmentId] = useState(user.department_id ?? "");
  const [isChangingDepartment, setIsChangingDepartment] = useState(false);

  const canApplyDepartmentChange =
    pendingDepartmentId !== "" && pendingDepartmentId !== appliedDepartmentId;

  const handleConfirmDepartmentChange = async () => {
    setIsChangingDepartment(true);
    try {
      const result = await updateUserDepartmentAction(user.id, pendingDepartmentId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("소속 부서가 변경되었습니다.");
      setAppliedDepartmentId(pendingDepartmentId);
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsChangingDepartment(false);
    }
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <Link
        href="/protected/admin/users"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        목록으로
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg" className={preset.bgClass}>
              <AvatarFallback className="bg-transparent text-lg">{preset.emoji}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                {user.email}
                {isSelf && <Badge variant="outline">나</Badge>}
              </CardTitle>
              <CardDescription>가입일 {formatDate(user.created_at)}</CardDescription>
            </div>
          </div>
          <Badge variant={user.role === "user" ? "secondary" : "success"}>
            {user.role === "superadmin"
              ? "슈퍼관리자"
              : user.role === "admin"
                ? "관리자"
                : "일반 사용자"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">이름</p>
            <p className="font-medium">{user.name ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">소속 부서</p>
            <p className="font-medium">{user.department_name ?? "미배정"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">전화번호</p>
            <p className="font-medium">{user.phone_number ?? "등록되지 않음"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">자기소개</p>
            <p className="whitespace-pre-wrap font-medium">
              {user.bio ?? "작성된 자기소개가 없습니다."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">작성한 주간업무일지 요약</CardTitle>
          <CardDescription>
            강등·부서 이전 여부를 판단할 근거로 총 건수와 최근 작성 이력을 보여줍니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="rounded-md border px-4 py-2">
              <p className="text-xs text-muted-foreground">총 작성 건수</p>
              <p className="text-xl font-bold">{logSummary.totalCount}건</p>
            </div>
            {STATUS_ORDER.map((status) => (
              <div key={status} className="rounded-md border px-4 py-2">
                <p className="text-xs text-muted-foreground">{getStatusLabel(status)}</p>
                <p className="text-xl font-bold">{logSummary.statusCounts[status]}건</p>
              </div>
            ))}
          </div>
          {logSummary.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">작성한 업무일지가 없습니다.</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-md border">
              {logSummary.recent.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <Link
                    href={`/protected/weekly-logs/${log.id}`}
                    className="truncate text-sm font-medium hover:text-primary hover:underline"
                  >
                    {log.title}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatDate(log.start_date)}
                    </span>
                    <StatusBadge status={log.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">역할 및 소속 부서 변경</CardTitle>
          <CardDescription>
            변경 사항은 저장 즉시 반영되며, 대상 사용자가 재로그인할 필요는 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label>역할</Label>
            <UserRoleSelect
              userId={user.id}
              role={user.role}
              disabled={isSelf}
              disabledReason="본인 역할은 변경할 수 없습니다."
              className="w-44"
            />
            {isSelf && (
              <p className="text-xs text-muted-foreground">본인 역할은 변경할 수 없습니다.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="department-select">소속 부서</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={pendingDepartmentId}
                onValueChange={setPendingDepartmentId}
                disabled={isChangingDepartment}
              >
                <SelectTrigger id="department-select" className="w-56">
                  <SelectValue placeholder="부서를 선택하세요" />
                </SelectTrigger>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" disabled={!canApplyDepartmentChange || isChangingDepartment}>
                    {isChangingDepartment ? "변경 중..." : "변경"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>소속 부서를 변경하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {formatDepartmentChangeWarning(logSummary.totalCount)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDepartmentChange}>
                      변경
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-xs text-muted-foreground">
              부서를 변경하면 이 사용자가 작성한 기존 업무일지의 쓰기 권한을 잃습니다
              (조회는 계속 가능합니다).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
