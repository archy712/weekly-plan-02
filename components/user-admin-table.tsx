"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { UserRoleSelect } from "@/components/user-role-select";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { formatDate } from "@/lib/format";
import { ALL_DEPARTMENTS_FILTER, ALL_ROLES_FILTER } from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  RoleFilter,
  UserAdminListItem,
} from "@/lib/types";

const PAGE_SIZE = 20;

// weekly-log-list-view.tsx와 동일한 앞/뒤/현재 주변 페이지 번호 + 생략(...) 처리.
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) {
      result.push("ellipsis");
    }
    result.push(page);
    previous = page;
  }
  return result;
}

export function UserAdminTable({
  items,
  departments,
  currentDepartmentId,
  currentRole,
  currentSearchQuery,
  currentUserId,
}: {
  items: UserAdminListItem[];
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentRole: RoleFilter;
  currentSearchQuery?: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState(currentSearchQuery ?? "");
  const [prevKey, setPrevKey] = useState(
    `${currentDepartmentId}::${currentRole}::${currentSearchQuery ?? ""}`,
  );

  // 필터/검색어(서버에서 확정된 값)가 바뀌면 항목 목록이 통째로 달라지므로 페이지를
  // 1로 되돌리고 입력값도 최신 서버 상태와 맞춘다(뒤로가기 대응).
  const currentKey = `${currentDepartmentId}::${currentRole}::${currentSearchQuery ?? ""}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setCurrentPage(1);
    setSearchInput(currentSearchQuery ?? "");
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(
    () => items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [items, safePage],
  );

  const navigate = (overrides: { department?: string; role?: string; q?: string }) => {
    const params = new URLSearchParams();
    params.set("department", overrides.department ?? currentDepartmentId);
    params.set("role", overrides.role ?? currentRole);
    const q = (overrides.q ?? currentSearchQuery ?? "").trim();
    if (q) params.set("q", q);
    router.push(`/protected/admin/users?${params.toString()}`);
  };

  const handleDepartmentChange = (value: string) => navigate({ department: value });
  const handleRoleChange = (value: string) => navigate({ role: value });
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ q: searchInput });
  };

  const hasSelfOnPage = pagedItems.some((item) => item.id === currentUserId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="이메일로 검색"
            aria-label="사용자 검색"
            className="w-56"
          />
          <Button type="submit" variant="outline" size="icon" aria-label="검색">
            <Search className="size-4" />
          </Button>
        </form>
        <Select value={currentDepartmentId} onValueChange={handleDepartmentChange}>
          <SelectTrigger className="w-48" aria-label="부서 필터">
            <SelectValue placeholder="부서 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DEPARTMENTS_FILTER}>전체 부서</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.archived_at ? `${dept.name} (비활성)` : dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currentRole} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-36" aria-label="역할 필터">
            <SelectValue placeholder="역할 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ROLES_FILTER}>전체 역할</SelectItem>
            <SelectItem value="user">일반 사용자</SelectItem>
            <SelectItem value="admin">관리자</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title={currentSearchQuery ? "검색 결과가 없습니다" : "표시할 사용자가 없습니다"}
          description={currentSearchQuery ? "다른 검색어로 다시 시도해보세요." : undefined}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 pl-4 text-sm font-bold tracking-wide text-foreground uppercase">
                    이메일
                  </TableHead>
                  <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                    이름
                  </TableHead>
                  <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                    소속 부서
                  </TableHead>
                  <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                    역할
                  </TableHead>
                  <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                    가입일
                  </TableHead>
                  <TableHead className="h-11 pr-4 text-right text-sm font-bold tracking-wide text-foreground uppercase">
                    액션
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedItems.map((item) => {
                  const isSelf = item.id === currentUserId;
                  const preset = getAvatarPreset(item.avatar_key);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="py-3 pl-4 font-medium">
                        <Link
                          href={`/protected/admin/users/${item.id}`}
                          className="flex items-center gap-2 hover:text-primary hover:underline"
                        >
                          <Avatar size="sm" className={preset.bgClass}>
                            <AvatarFallback className="bg-transparent text-xs">
                              {preset.emoji}
                            </AvatarFallback>
                          </Avatar>
                          {item.email}
                          {isSelf && (
                            <Badge variant="outline" className="font-normal">
                              나
                            </Badge>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3 text-muted-foreground">
                        {item.name ?? "-"}
                      </TableCell>
                      <TableCell className="py-3 text-muted-foreground">
                        {item.department_name ?? "미배정"}
                      </TableCell>
                      <TableCell className="py-3">
                        <UserRoleSelect
                          userId={item.id}
                          role={item.role}
                          disabled={isSelf}
                          disabledReason="본인 역할은 변경할 수 없습니다."
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="py-3 tabular-nums text-muted-foreground">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell className="py-3 pr-4 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/protected/admin/users/${item.id}`}>상세 보기</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {hasSelfOnPage && (
            <p className="text-xs text-muted-foreground">
              * 본인 계정의 역할은 안전을 위해 이 화면에서 변경할 수 없습니다.
            </p>
          )}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (safePage > 1) setCurrentPage(safePage - 1);
                    }}
                    className={safePage === 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                {getPageNumbers(safePage, totalPages).map((page, index) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === safePage}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (safePage < totalPages) setCurrentPage(safePage + 1);
                    }}
                    className={
                      safePage === totalPages ? "pointer-events-none opacity-50" : undefined
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
