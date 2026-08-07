"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { LoadingBar } from "@/components/loading-bar";
import { UserRoleSelect } from "@/components/user-role-select";
import { UserAdminCardList } from "@/components/user-admin-card";
import { SortableTableHead, type SortDirection } from "@/components/sortable-table-head";
import { loadMoreUsersAction } from "@/lib/actions/user-admin-list";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { ALL_DEPARTMENTS_FILTER, ALL_ROLES_FILTER } from "@/lib/types";
import type {
  Department,
  DepartmentFilter,
  RoleFilter,
  UserAdminListItem,
  UserAdminSortKey,
} from "@/lib/types";

export function UserAdminTable({
  initialItems,
  initialHasMore,
  totalCount,
  departments,
  currentDepartmentId,
  currentRole,
  currentSearchQuery,
  currentUserId,
  currentSortKey,
  currentSortDirection,
}: {
  initialItems: UserAdminListItem[];
  initialHasMore: boolean;
  totalCount: number;
  departments: Department[];
  currentDepartmentId: DepartmentFilter;
  currentRole: RoleFilter;
  currentSearchQuery?: string;
  currentUserId: string;
  currentSortKey: UserAdminSortKey | null;
  currentSortDirection: SortDirection;
}) {
  const router = useRouter();
  // 필터/검색/정렬은 URL 쿼리파라미터만 바뀌는 soft navigation이라 Suspense 스켈레톤이 다시
  // 뜨지 않아 재조회 동안 화면이 멈춘 것처럼 보인다. transition으로 감싸 isPending을 얻어
  // 상단 로딩 바 + 결과 dim으로 진행 중임을 알린다(weekly-log-list-view.tsx와 동일한 패턴).
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearchQuery ?? "");

  // 무한 스크롤 상태: 서버가 내려준 첫 배치를 시드로 삼고, 하단 센티넬이 보이면 서버 액션으로
  // 다음 배치를 이어 붙인다. 정렬은 서버 ORDER BY로 처리하므로 여기서 다시 정렬하지 않는다.
  const [items, setItems] = useState<UserAdminListItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const [prevKey, setPrevKey] = useState(
    `${currentDepartmentId}::${currentRole}::${currentSearchQuery ?? ""}::${currentSortKey ?? ""}::${currentSortDirection}`,
  );

  // 필터/검색어/정렬(서버에서 확정된 값)이 바뀌면 서버가 첫 배치를 다시 내려 initialItems가
  // 갱신되므로, 목록 상태를 그 첫 배치로 되돌린다(뒤로가기·필터 변경 대응).
  const currentKey = `${currentDepartmentId}::${currentRole}::${currentSearchQuery ?? ""}::${currentSortKey ?? ""}::${currentSortDirection}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setItems(initialItems);
    setHasMore(initialHasMore);
    setSearchInput(currentSearchQuery ?? "");
  }

  // from/to가 없어 weekly-logs보다 단순하다. sort는 명시적으로 null을 넘기면 해제, undefined면 유지.
  const navigate = (overrides: {
    department?: string;
    role?: string;
    q?: string;
    sort?: UserAdminSortKey | null;
    dir?: SortDirection;
  }) => {
    const params = new URLSearchParams();
    params.set("department", overrides.department ?? currentDepartmentId);
    params.set("role", overrides.role ?? currentRole);
    const q = (overrides.q ?? currentSearchQuery ?? "").trim();
    if (q) params.set("q", q);
    const sortKey = overrides.sort === null ? null : (overrides.sort ?? currentSortKey);
    if (sortKey) {
      params.set("sort", sortKey);
      params.set("dir", overrides.dir ?? currentSortDirection);
    }
    startTransition(() => {
      router.push(`/protected/admin/users?${params.toString()}`);
    });
  };

  const handleDepartmentChange = (value: string) => navigate({ department: value });
  const handleRoleChange = (value: string) => navigate({ role: value });
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ q: searchInput });
  };

  // 정렬 헤더 토글은 클라이언트 정렬이 아니라 URL을 바꿔 서버가 첫 배치를 다시 정렬해 내려주게
  // 한다(증분 로딩과 정합). 같은 키 재클릭 → 오름/내림 토글, 다른 키 → 오름차순부터.
  const handleSort = (key: UserAdminSortKey) => {
    if (currentSortKey === key) {
      navigate({ sort: key, dir: currentSortDirection === "asc" ? "desc" : "asc" });
    } else {
      navigate({ sort: key, dir: "asc" });
    }
  };

  const rawFilters = {
    department: currentDepartmentId,
    role: currentRole,
    q: currentSearchQuery ?? "",
  };
  const rawSort = { key: currentSortKey, direction: currentSortDirection };

  // 하단 센티넬이 보이면 다음 배치를 이어 붙인다. 옵저버가 짧은 순간에 여러 번 발화해도
  // loadingRef로 동시 호출을 막는다(state 갱신 전에 동기적으로 잠금).
  const loadMore = async () => {
    if (loadingRef.current || !hasMore || isPending) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const result = await loadMoreUsersAction({
        filters: rawFilters,
        sort: rawSort,
        offset: items.length,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const next = result.items.filter((item) => !seen.has(item.id));
        return next.length > 0 ? [...prev, ...next] : prev;
      });
      setHasMore(result.hasMore);
    } catch {
      toast.error("사용자 목록을 불러오지 못했습니다.");
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  // IntersectionObserver 콜백이 항상 최신 loadMore 클로저를 부르도록 ref로 넘긴다 — 옵저버는
  // 한 번만 설치한다. ref 갱신은 렌더 중이 아니라 커밋 후(effect)에 한다.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasSelfInList = items.some((item) => item.id === currentUserId);
  const hasActiveFilter =
    currentDepartmentId !== ALL_DEPARTMENTS_FILTER ||
    currentRole !== ALL_ROLES_FILTER ||
    !!currentSearchQuery;

  return (
    <div className="flex flex-col gap-4">
      <LoadingBar active={isPending} />
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
            <SelectItem value="superadmin">슈퍼관리자</SelectItem>
          </SelectContent>
        </Select>
        {/* 현재 필터 조건에 맞는 총 사용자 수 — 필터 행 오른쪽에 우측 정렬. */}
        <p className="text-muted-foreground ml-auto text-sm">
          {hasActiveFilter ? "조건에 맞는 사용자" : "총 사용자"}{" "}
          <span className="text-foreground font-medium">
            {totalCount.toLocaleString()}
          </span>
          명
        </p>
      </div>
      <div
        className={cn(
          "flex flex-col gap-4 transition-opacity",
          isPending && "pointer-events-none opacity-60",
        )}
        aria-busy={isPending}
      >
        {items.length === 0 ? (
          <EmptyState
            title={currentSearchQuery ? "검색 결과가 없습니다" : "표시할 사용자가 없습니다"}
            description={currentSearchQuery ? "다른 검색어로 다시 시도해보세요." : undefined}
          />
        ) : (
          <>
            {/* 모바일에서는 고정폭 테이블이 가로 스크롤을 유발하므로 weekly-log 목록과
                동일하게 md 미만은 카드, md 이상은 테이블로 나눠 렌더링한다. */}
            <UserAdminCardList items={items} currentUserId={currentUserId} />
            <div className="hidden overflow-x-auto rounded-lg border shadow-sm md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableTableHead
                      label="이메일"
                      sortKey="email"
                      currentSortKey={currentSortKey}
                      currentDirection={currentSortDirection}
                      onSort={handleSort}
                      className="pl-4"
                    />
                    <SortableTableHead
                      label="이름"
                      sortKey="name"
                      currentSortKey={currentSortKey}
                      currentDirection={currentSortDirection}
                      onSort={handleSort}
                    />
                    {/* 소속 부서는 to-one 임베드라 부모를 안정적으로 정렬할 수 없어 정렬 불가
                        일반 헤더로 둔다(증분 로딩은 서버 정렬만 사용). */}
                    <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                      소속 부서
                    </TableHead>
                    {/* 역할은 "슈퍼관리자→관리자→일반" 커스텀 순위라 DB ORDER BY로 표현할 수
                        없어 정렬 불가 일반 헤더로 둔다. */}
                    <TableHead className="h-11 text-sm font-bold tracking-wide text-foreground uppercase">
                      역할
                    </TableHead>
                    <SortableTableHead
                      label="가입일"
                      sortKey="created_at"
                      currentSortKey={currentSortKey}
                      currentDirection={currentSortDirection}
                      onSort={handleSort}
                    />
                    <TableHead className="h-11 pr-4 text-right text-sm font-bold tracking-wide text-foreground uppercase">
                      액션
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
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
                            className="w-36"
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
            {hasSelfInList && (
              <p className="text-xs text-muted-foreground">
                * 본인 계정의 역할은 안전을 위해 이 화면에서 변경할 수 없습니다.
              </p>
            )}
            {/* 더 있으면 하단 센티넬을 두고, 화면에 들어오면 다음 배치를 로딩한다. 진행률을 알
                수 없는 조회라 비결정형 인디케이터 바로 "불러오는 중"만 알린다. */}
            {hasMore && (
              <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-4">
                <LoadingBar active className="max-w-xs" />
                <p className="text-muted-foreground text-sm">
                  {isLoadingMore ? "불러오는 중..." : "스크롤하면 더 불러옵니다"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
