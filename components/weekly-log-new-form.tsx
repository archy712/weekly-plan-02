"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { WeeklyLogForm } from "@/components/weekly-log-form";
import { createWeeklyLogAction } from "@/lib/actions/weekly-log";
import type { WeeklyLogFormData } from "@/lib/schemas/weekly-log";

export function WeeklyLogNewForm() {
  const router = useRouter();

  const handleSubmit = async (values: WeeklyLogFormData) => {
    const result = await createWeeklyLogAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("주간업무일지가 저장되었습니다.");
    router.push("/protected/weekly-logs");
  };

  return (
    <WeeklyLogForm
      submitLabel="저장"
      onCancel={() => router.push("/protected/weekly-logs")}
      onSubmit={handleSubmit}
    />
  );
}
