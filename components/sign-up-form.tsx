"use client";

import { cn, formatPhoneNumberInput } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { AvatarPickerDialog } from "@/components/avatar-picker-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AvatarKey } from "@/lib/constants/avatars";
import { profileSchema } from "@/lib/schemas/profile";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarKey, setAvatarKey] = useState<AvatarKey>("fox");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    const nameCheck = profileSchema.shape.name.safeParse(name);
    if (!nameCheck.success) {
      setError(nameCheck.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    const phoneCheck = profileSchema.shape.phone_number.safeParse(phoneNumber);
    if (!phoneCheck.success) {
      setError(phoneCheck.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });
      if (error) throw error;

      // 가입 계정 생성은 이미 성공했으므로, 부가 프로필 정보 저장 실패는
      // 가입 자체를 막지 않는다 — 실패해도 프로필 화면에서 나중에 입력 가능
      if (data.user) {
        await supabase
          .from("profiles")
          .update({
            name: name || null,
            phone_number: phoneNumber || null,
            avatar_key: avatarKey,
            bio: bio || null,
          })
          .eq("id", data.user.id);
      }

      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>새 계정을 만들어보세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">비밀번호</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">비밀번호 확인</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">이름 (선택)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">전화번호 (선택)</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="010-1234-5678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhoneNumberInput(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label>아바타 (선택)</Label>
                <AvatarPickerDialog value={avatarKey} onChange={setAvatarKey} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">자기소개 (선택)</Label>
                <Textarea
                  id="bio"
                  placeholder="간단한 자기소개를 입력해주세요."
                  maxLength={500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                가입 완료 후 바로 이용하실 수 있습니다.
              </p>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "계정 생성 중..." : "회원가입"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              이미 계정이 있으신가요?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                로그인
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
