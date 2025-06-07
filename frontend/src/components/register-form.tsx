"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";

export type RegisterData = {
  displayName: string;
  email: string;
  password: string;
};

interface RegisterFormProps extends Omit<React.ComponentProps<"div">, "onSubmit"> {
  className?: string;
  onSubmit?: (data: RegisterData) => void;
  isSubmitting?: boolean; // Optional prop to indicate if the form is submitting
  error?: string;
}

export function RegisterForm({ className, onSubmit, isSubmitting = false, error, ...props }: RegisterFormProps) {
  const [formData, setFormData] = useState<RegisterData>({
    displayName: "",
    email: "",
    password: ""
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      password: value
    }));
    if (confirmPassword && value !== confirmPassword) {
      setPasswordError("密碼不匹配");
    } else {
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (formData.password && e.target.value !== formData.password) {
      setPasswordError("密碼不匹配");
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit && !passwordError && formData.password === confirmPassword) {
      onSubmit(formData);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader>
          <CardTitle>註冊</CardTitle>
          <CardDescription>輸入你的資訊來創建你的帳號</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="displayName">用戶名稱</Label>
                <Input id="displayName" name="displayName" type="text" placeholder="John Doe" value={formData.displayName} onChange={handleInputChange} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">電子郵件</Label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">密碼</Label>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handlePasswordChange} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="confirmPassword">確認密碼</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" value={confirmPassword} onChange={handleConfirmPasswordChange} required />
                {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={passwordError !== "" || !formData.password || !confirmPassword || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2Icon className="animate-spin" />
                      正在創建帳號...
                    </>
                  ) : (
                    "創建帳號"
                  )}
                </Button>
                {error && (
                  <div className="text-sm text-red-500 text-center">
                    <pre className="whitespace-pre-wrap text-left bg-red-50 p-2 rounded border overflow-auto max-h-32">{error}</pre>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              已經擁有帳號？{" "}
              <a href="/login" className="underline underline-offset-4">
                登入
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
