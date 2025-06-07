"use client";

import { getUser } from "@/lib/api/auth";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type UseAuthOptions = {
  redirectIfUnauthenticated?: boolean;
};

type UseAuthReturn = {
  user: any; // Replace with your user type
  isLoading: boolean;
  isError: boolean;
  error: any; // Replace with your error type
};

function useAuth({ redirectIfUnauthenticated = true }: UseAuthOptions = {}) {
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
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export default useAuth;
