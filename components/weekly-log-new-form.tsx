"use client";

import { useRouter } from "next/navigation";

import { WeeklyLogForm } from "@/components/weekly-log-form";

export function WeeklyLogNewForm() {
  const router = useRouter();

  return (
    <WeeklyLogForm
      submitLabel="저장"
      onCancel={() => router.push("/protected/weekly-logs")}
      onSubmit={() => router.push("/protected/weekly-logs")}
    />
  );
}
