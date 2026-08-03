import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { WeeklyLogNewForm } from "@/components/weekly-log-new-form";
import { Skeleton } from "@/components/ui/skeleton";

async function NewWeeklyLogContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile?.department_id) {
    redirect("/protected/profile");
  }

  return <WeeklyLogNewForm />;
}

export default function NewWeeklyLogPage() {
  return (
    <div className="flex-1 w-full max-w-2xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold">주간업무일지 작성</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-md" />}>
        <NewWeeklyLogContent />
      </Suspense>
    </div>
  );
}
