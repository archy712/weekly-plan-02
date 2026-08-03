import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { dummyWeeklyLogs } from "@/lib/dummy-data";
import { WeeklyLogDetailView } from "@/components/weekly-log-detail-view";
import { WeeklyLogDetailSkeleton } from "@/components/weekly-log-detail-skeleton";

async function WeeklyLogDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const log = dummyWeeklyLogs.find((item) => item.id === id);

  if (!log) {
    notFound();
  }

  return <WeeklyLogDetailView log={log} />;
}

export default function WeeklyLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex-1 w-full max-w-2xl flex flex-col gap-6">
      <Suspense fallback={<WeeklyLogDetailSkeleton />}>
        <WeeklyLogDetailContent params={params} />
      </Suspense>
    </div>
  );
}
