import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentRowActions } from "@/components/department-row-actions";
import type { Organization } from "@/lib/types";

type DepartmentCardData = {
  id: string;
  name: string;
  archived_at: string | null;
  organization_id: string;
  organization_name: string;
};

export function DepartmentCard({
  department,
  organizations,
  memberCount,
  logCount,
}: {
  department: DepartmentCardData;
  organizations: Organization[];
  memberCount: number;
  logCount: number;
}) {
  const isArchived = Boolean(department.archived_at);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
        <CardTitle className="text-base">{department.name}</CardTitle>
        <Badge variant={isArchived ? "secondary" : "success"}>
          {isArchived ? "비활성" : "활성"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{department.organization_name}</span>
          <span>소속 인원 {memberCount}명</span>
          <span>업무일지 {logCount}건</span>
        </div>
        <DepartmentRowActions
          department={department}
          organizations={organizations}
          memberCount={memberCount}
          logCount={logCount}
        />
      </CardContent>
    </Card>
  );
}

export function DepartmentCardList({
  departments,
  organizations,
  countMap,
}: {
  departments: DepartmentCardData[];
  organizations: Organization[];
  countMap: Map<string, { memberCount: number; logCount: number }>;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {departments.map((department) => {
        const { memberCount, logCount } = countMap.get(department.id) ?? {
          memberCount: 0,
          logCount: 0,
        };
        return (
          <DepartmentCard
            key={department.id}
            department={department}
            organizations={organizations}
            memberCount={memberCount}
            logCount={logCount}
          />
        );
      })}
    </div>
  );
}
