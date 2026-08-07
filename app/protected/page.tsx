import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

async function ProtectedRedirect(): Promise<never> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("weeklyplan_profiles")
    .select("department_id")
    .eq("id", data.claims.sub)
    .maybeSingle();

  redirect(
    profile?.department_id ? "/protected/weekly-logs" : "/protected/profile",
  );
}

export default function ProtectedPage() {
  return (
    <Suspense>
      <ProtectedRedirect />
    </Suspense>
  );
}
