"use client";

import { LoginData, LoginForm } from "@/components/login-form";
import { loginUser } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

export default function LoginPage() {
  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      console.log("Login successful:", data);
    },
    onError: (error) => {
      console.error("Login failed:", error);
    },
  });

  const onSubmit = (data: LoginData) => {
    mutation.mutate(data);
  };

  const getErrorMessage = (error: any) => {
    if (error?.fullResponse) {
      return JSON.stringify(error.fullResponse, null, 2);
    }
    return error?.message || "An unknown error occurred";
  };

  return (
    <div className="h-full w-full flex flex-col justify-center">
      <LoginForm
        onSubmit={onSubmit}
        isSubmitting={mutation.isPending}
        error={mutation.error ? getErrorMessage(mutation.error) : undefined}
      />
    </div>
  );
}
