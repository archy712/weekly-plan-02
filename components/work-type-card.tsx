import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkTypeRowActions } from "@/components/work-type-row-actions";
import type { Organization } from "@/lib/types";

type WorkTypeCardData = {
  id: string;
  name: string;
  archived_at: string | null;
  organization_id: string;
  organization_name: string;
};

export function WorkTypeCard({
  workType,
  organizations,
  logCount,
}: {
  workType: WorkTypeCardData;
  organizations: Organization[];
  logCount: number;
}) {
  const isArchived = Boolean(workType.archived_at);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
        <CardTitle className="text-base">{workType.name}</CardTitle>
        <Badge variant={isArchived ? "secondary" : "success"}>
          {isArchived ? "비활성" : "활성"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{workType.organization_name}</span>
          <span>업무일지 {logCount}건</span>
        </div>
        <WorkTypeRowActions workType={workType} organizations={organizations} logCount={logCount} />
      </CardContent>
    </Card>
  );
}

export function WorkTypeCardList({
  workTypes,
  organizations,
  countMap,
}: {
  workTypes: WorkTypeCardData[];
  organizations: Organization[];
  countMap: Map<string, number>;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {workTypes.map((workType) => (
        <WorkTypeCard
          key={workType.id}
          workType={workType}
          organizations={organizations}
          logCount={countMap.get(workType.id) ?? 0}
        />
      ))}
    </div>
  );
}
