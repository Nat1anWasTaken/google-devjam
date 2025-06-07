"use client";

import { RegisterData, RegisterForm } from "@/components/register-form";
import { registerUser, storeToken } from "@/lib/api/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      console.log("Registration successful:", data);

      if (data.token) {
        storeToken(data.token);
      }

      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      router.push("/");
    },
    onError: (error) => {
      console.error("Registration failed:", error);
    },
  });

  const onSubmit = (data: RegisterData) => {
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
      <RegisterForm
        onSubmit={onSubmit}
        isSubmitting={mutation.isPending}
        error={mutation.error ? getErrorMessage(mutation.error) : undefined}
      />
    </div>
  );
}
