import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { dummyDepartments, dummyWeeklyLogListItems } from "@/lib/dummy-data";
import { WeeklyLogListView } from "@/components/weekly-log-list-view";
import { WeeklyLogListSkeleton } from "@/components/weekly-log-list-skeleton";

async function WeeklyLogsContent({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { admin } = await searchParams;
  const isAdmin = admin === "1";

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id, departments(name)")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile?.department_id) {
    redirect("/protected/profile");
  }

  return (
    <WeeklyLogListView
      items={dummyWeeklyLogListItems}
      departments={dummyDepartments}
      isAdmin={isAdmin}
      currentDepartmentName={profile?.departments?.name ?? null}
    />
  );
}

export default function WeeklyLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold">주간업무일지</h1>
      <Suspense fallback={<WeeklyLogListSkeleton />}>
        <WeeklyLogsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
