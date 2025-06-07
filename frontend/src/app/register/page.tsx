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
    onSuccess: async (data) => {
      console.log("Registration successful:", data);

      if (data.token) {
        storeToken(data.token);
        console.log("Token stored successfully");
      }

      try {
        // Extract user data from register response (RegisterResponse extends User)
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
        console.error("Error during post-registration setup:", error);
        // Still redirect even if cache operations fail
        router.push("/vocabulary");
      }
    },
    onError: (error) => {
      console.error("Registration failed:", error);
    }
  });

  const onSubmit = (data: RegisterData) => {
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
      <RegisterForm onSubmit={onSubmit} isSubmitting={mutation.isPending} error={mutation.error ? getErrorMessage(mutation.error) : undefined} />
    </div>
  );
}
