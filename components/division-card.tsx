import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DivisionRowActions } from "@/components/division-row-actions";
import { formatHeadName } from "@/lib/format";
import type { HeadCandidate, Organization } from "@/lib/types";

type DivisionCardData = {
  id: string;
  name: string;
  archived_at: string | null;
  organization_id: string;
  organization_name: string;
  head_profile_id: string | null;
  head_name: string | null;
  head_email: string | null;
};

export function DivisionCard({
  division,
  organizations,
  headCandidates,
  departmentCount,
}: {
  division: DivisionCardData;
  organizations: Organization[];
  headCandidates: HeadCandidate[];
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
          <span>
            부서장{" "}
            {formatHeadName(
              division.head_profile_id
                ? { name: division.head_name, email: division.head_email }
                : null,
            )}
          </span>
          <span>소속 팀 {departmentCount}개</span>
        </div>
        <DivisionRowActions
          division={division}
          organizations={organizations}
          headCandidates={headCandidates}
          departmentCount={departmentCount}
        />
      </CardContent>
    </Card>
  );
}

export function DivisionCardList({
  divisions,
  organizations,
  headCandidatesByDivision,
  countMap,
}: {
  divisions: DivisionCardData[];
  organizations: Organization[];
  headCandidatesByDivision: Map<string, HeadCandidate[]>;
  countMap: Map<string, number>;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {divisions.map((division) => (
        <DivisionCard
          key={division.id}
          division={division}
          organizations={organizations}
          headCandidates={headCandidatesByDivision.get(division.id) ?? []}
          departmentCount={countMap.get(division.id) ?? 0}
        />
      ))}
    </div>
  );
}
