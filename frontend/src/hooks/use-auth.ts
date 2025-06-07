"use client";

import { getStoredToken, removeStoredToken, isTokenValid } from "@/lib/api/auth";
import { getUser } from "@/lib/api/user";
import { logAuthDebugInfo } from "@/lib/auth-debug";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UseAuthOptions = {
  redirectIfUnauthenticated?: boolean;
};

type UseAuthReturn = {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export default function useAuth({ redirectIfUnauthenticated = true }: UseAuthOptions = {}): UseAuthReturn {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize token on client side to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
    const storedToken = getStoredToken();

    // Validate token before using it
    if (storedToken && isTokenValid()) {
      setToken(storedToken);
    } else if (storedToken) {
      // Token exists but is invalid, clear it
      console.log("useAuth: Invalid token found, clearing");
      removeStoredToken();
      setToken(null);
    } else {
      setToken(null);
    }
  }, []);

  const query = useQuery({
    queryKey: ["currentUser"],
    queryFn: getUser,
    enabled: isClient && !!token, // Only run query if we're on client and have a token
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (unauthorized)
      if (error?.message?.includes("401") || error?.status === 401) {
        return false;
      }
      // Retry up to 3 times for other errors (network issues, etc.)
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000 // Keep in cache for 10 minutes
  });

  useEffect(() => {
    if (!isClient) return;

    // Log debug info whenever auth state changes
    logAuthDebugInfo("useAuth Effect");

    // Case 1: No token and should redirect
    if (redirectIfUnauthenticated && !token && !query.isLoading) {
      console.log("useAuth: No token found, redirecting to login");
      router.push("/login");
      return;
    }

    // Case 2: Have token but query failed with auth error
    if (redirectIfUnauthenticated && token && query.isError) {
      const error = query.error as any;
      if (error?.message?.includes("401") || error?.status === 401) {
        console.log("useAuth: Token invalid/expired, clearing and redirecting to login");
        logAuthDebugInfo("Before clearing token");
        removeStoredToken();
        setToken(null);
        router.push("/login");
        return;
      }
    }

    // Case 3: Query succeeded but returned null (should not happen with proper backend)
    if (redirectIfUnauthenticated && token && !query.isLoading && !query.isError && query.data === null) {
      console.log("useAuth: Valid token but no user data, clearing token and redirecting");
      logAuthDebugInfo("Valid token but no user data");
      removeStoredToken();
      setToken(null);
      router.push("/login");
      return;
    }
  }, [isClient, redirectIfUnauthenticated, token, query.isLoading, query.isError, query.data, query.error, router]);

  return {
    user: query.data ?? null,
    isLoading: query.isLoading || !isClient,
    isError: query.isError,
    error: query.error
  };
}
