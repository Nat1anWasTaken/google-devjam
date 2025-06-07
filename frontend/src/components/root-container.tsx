"use client";

import { isMobile } from "@/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DeviceNotSupported } from "./device-not-supported";

const queryClient = new QueryClient();

export function RootContainer({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setMobile(isMobile());

    const handleResize = () => {
      setMobile(isMobile());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return null;
  }

  return mobile ? (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-screen w-screen">
        <div className="flex-grow"></div>
        {children}
      </div>
    </QueryClientProvider>
  ) : (
    <DeviceNotSupported />
  );
}
