import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                회원가입이 완료되었습니다!
              </CardTitle>
              <CardDescription>이메일을 확인해주세요</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                가입하신 이메일로 인증 메일을 보내드렸습니다. 로그인하기 전에
                메일함에서 계정 인증을 완료해주세요.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
