"use client";

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
import { cn } from "@/lib/utils";
import { useState } from "react";

export type LoginData = {
  email: string;
  password: string;
};

interface LoginFormProps {
  className?: string;
  onSubmit?: (data: LoginData) => void;
  isSubmitting?: boolean;
  error?: string;
  [key: string]: any; // Allow additional props
}

export function LoginForm({
  className,
  onSubmit,
  isSubmitting,
  error,
  ...props
}: LoginFormProps) {
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader>
          <CardTitle>登入</CardTitle>
          <CardDescription>使用您的帳號登入以繼續</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">密碼</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    忘記密碼？
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "登入中..." : "登入"}
              </Button>
              {error && (
                <div className="text-sm text-red-500 text-center">
                  <pre className="whitespace-pre-wrap text-left bg-red-50 p-2 rounded border overflow-auto max-h-32">
                    {error}
                  </pre>
                </div>
              )}
            </div>
            <div className="mt-4 text-center text-sm">
              沒有帳號？{" "}
              <a href="/register" className="underline underline-offset-4">
                註冊
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
