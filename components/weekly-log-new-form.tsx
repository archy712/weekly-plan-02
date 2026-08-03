"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { WeeklyLogForm } from "@/components/weekly-log-form";
import { createWeeklyLogAction } from "@/lib/actions/weekly-log";
import type { WeeklyLogFormData } from "@/lib/schemas/weekly-log";

export function WeeklyLogNewForm() {
  const router = useRouter();

  const handleSubmit = async (values: WeeklyLogFormData) => {
    let result;
    try {
      result = await createWeeklyLogAction(values);
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      return;
    }
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
