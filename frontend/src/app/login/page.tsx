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
    onSuccess: async (data) => {
      console.log("Login successful:", data);

      if (data.token) {
        storeToken(data.token);
        console.log("Token stored successfully");
      }

      try {
        // Extract user data from login response (LoginResponse extends User)
        const { token: _token, ...userData } = data;

        // Pre-populate the query cache with user data
        if (userData && Object.keys(userData).length > 0) {
          queryClient.setQueryData(["currentUser"], userData);
          console.log("User data pre-populated in cache");
        }

        // Invalidate and refetch to ensure fresh data
        await queryClient.invalidateQueries({ queryKey: ["currentUser"] });

        // If we don't have meaningful user data in response, wait for refetch to complete
        if (!userData || Object.keys(userData).length === 0) {
          console.log("Waiting for user data to be fetched...");
          await queryClient.refetchQueries({
            queryKey: ["currentUser"],
            type: "active"
          });
        }

        console.log("Redirecting to vocabulary page");
        // Direct redirect to vocabulary to avoid double redirect chain
        router.push("/vocabulary");
      } catch (error) {
        console.error("Error during post-login setup:", error);
        // Still redirect even if cache operations fail
        router.push("/vocabulary");
      }
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
