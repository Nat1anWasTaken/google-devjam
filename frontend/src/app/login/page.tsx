"use client";

import { LoginData, LoginForm } from "@/components/login-form";
import { loginUser, storeToken } from "@/lib/api/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      console.log("Login successful:", data);

      if (data.token) {
        storeToken(data.token);
      }

      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      router.push("/");
    },
    onError: (error) => {
      console.error("Login failed:", error);
    }
  });

  const onSubmit = (data: LoginData) => {
    mutation.mutate(data);
  };

  const getErrorMessage = (error: Error & { fullResponse?: unknown }) => {
    if (error?.fullResponse) {
      return JSON.stringify(error.fullResponse, null, 2);
    }
    return error?.message || "An unknown error occurred";
  };

  return (
    <div className="h-full w-full flex flex-col justify-center">
      <LoginForm onSubmit={onSubmit} isSubmitting={mutation.isPending} error={mutation.error ? getErrorMessage(mutation.error) : undefined} />
    </div>
  );
}
