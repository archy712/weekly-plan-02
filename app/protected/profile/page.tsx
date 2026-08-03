import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";

async function ProfileContent() {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;

  const [{ data: profile, error: profileError }, { data: departments, error: departmentsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, department_id")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("departments").select("id, name").order("name"),
    ]);

  if (profileError) {
    throw profileError;
  }
  if (departmentsError) {
    throw departmentsError;
  }

  return (
    <ProfileForm
      profile={
        profile ?? {
          id: userId,
          email: data.claims.email ?? null,
          department_id: null,
        }
      }
      departments={departments ?? []}
    />
  );
}

export default function ProfilePage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <Suspense>
        <ProfileContent />
      </Suspense>
    </div>
  );
}
