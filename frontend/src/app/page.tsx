"use client";

import useAuth from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth({ redirectIfUnauthenticated: false });

  useEffect(() => {
    // Don't redirect while auth is loading
    if (isLoading) return;

    // If user is authenticated, redirect to vocabulary
    if (user) {
      console.log("Home: User authenticated, redirecting to vocabulary");
      router.push("/vocabulary");
    } else {
      // If not authenticated, redirect to login
      console.log("Home: User not authenticated, redirecting to login");
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Show loading or nothing while determining auth state
  return (
    <div className="h-full w-full flex items-center justify-center">
      {isLoading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      )}
    </div>
  );
}
