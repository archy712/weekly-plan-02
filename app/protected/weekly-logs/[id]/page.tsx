import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function WeeklyLogDetailPage({
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

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <h1 className="text-2xl font-bold">주간업무일지 상세 ({id})</h1>
    </div>
  );
}
