"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to vocabulary page as the default
    router.push("/vocabulary");
  }, [router]);

  return null;
}
