import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationRowActions } from "@/components/organization-row-actions";

type OrganizationCardData = {
  id: string;
  name: string;
  archived_at: string | null;
};

export function OrganizationCard({
  organization,
  departmentCount,
}: {
  organization: OrganizationCardData;
  departmentCount: number;
}) {
  const isArchived = Boolean(organization.archived_at);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
        <CardTitle className="text-base">{organization.name}</CardTitle>
        <Badge variant={isArchived ? "secondary" : "success"}>
          {isArchived ? "비활성" : "활성"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        <div className="text-sm text-muted-foreground">소속 부서 {departmentCount}개</div>
        <OrganizationRowActions organization={organization} departmentCount={departmentCount} />
      </CardContent>
    </Card>
  );
}

export function OrganizationCardList({
  organizations,
  countMap,
}: {
  organizations: OrganizationCardData[];
  countMap: Map<string, number>;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {organizations.map((organization) => (
        <OrganizationCard
          key={organization.id}
          organization={organization}
          departmentCount={countMap.get(organization.id) ?? 0}
        />
      ))}
    </div>
  );
}
