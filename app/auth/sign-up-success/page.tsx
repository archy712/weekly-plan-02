"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                회원가입이 완료되었습니다!
              </CardTitle>
              <CardDescription>잠시 후 메인 화면으로 이동합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                가입해 주셔서 감사합니다. 곧 메인 화면으로 자동 이동합니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
