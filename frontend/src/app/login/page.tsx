"use client";

import { LoginData, LoginForm } from "@/components/login-form";
import { loginUser } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      console.log("Login successful:", data);
      router.push("/");
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
