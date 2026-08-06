import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentRowActions } from "@/components/department-row-actions";

type DepartmentCardData = {
  id: string;
  name: string;
  archived_at: string | null;
};

export function DepartmentCard({
  department,
  memberCount,
  logCount,
}: {
  department: DepartmentCardData;
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
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>소속 인원 {memberCount}명</span>
          <span>업무일지 {logCount}건</span>
        </div>
        <DepartmentRowActions
          department={department}
          memberCount={memberCount}
          logCount={logCount}
        />
      </CardContent>
    </Card>
  );
}

export function DepartmentCardList({
  departments,
  countMap,
}: {
  departments: DepartmentCardData[];
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
            memberCount={memberCount}
            logCount={logCount}
          />
        );
      })}
    </div>
  );
}
