import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function NewWeeklyLogPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <h1 className="text-2xl font-bold">주간업무일지 작성</h1>
    </div>
  );
}
