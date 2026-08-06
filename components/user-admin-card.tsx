import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UserRoleSelect } from "@/components/user-role-select";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { formatDate } from "@/lib/format";
import type { UserAdminListItem } from "@/lib/types";

export function UserAdminCard({
  item,
  isSelf,
}: {
  item: UserAdminListItem;
  isSelf: boolean;
}) {
  const preset = getAvatarPreset(item.avatar_key);

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <Link
          href={`/protected/admin/users/${item.id}`}
          className="flex items-center gap-2 hover:text-primary hover:underline"
        >
          <Avatar size="sm" className={preset.bgClass}>
            <AvatarFallback className="bg-transparent text-xs">{preset.emoji}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{item.email}</span>
          {isSelf && (
            <Badge variant="outline" className="font-normal">
              나
            </Badge>
          )}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4 pt-0">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{item.name ?? "-"}</span>
          <span>{item.department_name ?? "미배정"}</span>
          <span>{formatDate(item.created_at)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <UserRoleSelect
            userId={item.id}
            role={item.role}
            disabled={isSelf}
            disabledReason="본인 역할은 변경할 수 없습니다."
            className="w-36"
          />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/protected/admin/users/${item.id}`}>상세 보기</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function UserAdminCardList({
  items,
  currentUserId,
}: {
  items: UserAdminListItem[];
  currentUserId: string;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {items.map((item) => (
        <UserAdminCard key={item.id} item={item} isSelf={item.id === currentUserId} />
      ))}
    </div>
  );
}
