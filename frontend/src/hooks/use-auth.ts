"use client";

import { removeStoredToken } from "@/lib/api/auth";
import { getUser } from "@/lib/api/user";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type UseAuthOptions = {
  redirectIfUnauthenticated?: boolean;
};

type UseAuthReturn = {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export default function useAuth({
  redirectIfUnauthenticated = true,
}: UseAuthOptions = {}): UseAuthReturn {
  const router = useRouter();

  const query = useQuery({
    queryKey: ["currentUser"],
    queryFn: getUser,
  });

  useEffect(() => {
    if (
      redirectIfUnauthenticated &&
      !query.isLoading &&
      !query.isError &&
      query.data === null
    ) {
      removeStoredToken();
      router.push("/login");
    }
  }, [
    redirectIfUnauthenticated,
    query.isLoading,
    query.isError,
    query.data,
    router,
  ]);

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
