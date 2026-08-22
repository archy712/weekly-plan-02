import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DivisionRowActions } from "@/components/division-row-actions";
import type { Organization } from "@/lib/types";

type DivisionCardData = {
  id: string;
  name: string;
  archived_at: string | null;
  organization_id: string;
  organization_name: string;
};

export function DivisionCard({
  division,
  organizations,
  departmentCount,
}: {
  division: DivisionCardData;
  organizations: Organization[];
  departmentCount: number;
}) {
  const isArchived = Boolean(division.archived_at);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
        <CardTitle className="text-base">{division.name}</CardTitle>
        <Badge variant={isArchived ? "secondary" : "success"}>
          {isArchived ? "비활성" : "활성"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{division.organization_name}</span>
          <span>소속 팀 {departmentCount}개</span>
        </div>
        <DivisionRowActions
          division={division}
          organizations={organizations}
          departmentCount={departmentCount}
        />
      </CardContent>
    </Card>
  );
}

export function DivisionCardList({
  divisions,
  organizations,
  countMap,
}: {
  divisions: DivisionCardData[];
  organizations: Organization[];
  countMap: Map<string, number>;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {divisions.map((division) => (
        <DivisionCard
          key={division.id}
          division={division}
          organizations={organizations}
          departmentCount={countMap.get(division.id) ?? 0}
        />
      ))}
    </div>
  );
}
