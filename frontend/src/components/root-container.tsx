"use client";

import { isMobile } from "@/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNavigation } from "./bottom-navigation";
import { DeviceNotSupported } from "./device-not-supported";

const queryClient = new QueryClient();

export function RootContainer({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();

  // Check if we're on a page that should show bottom navigation
  const shouldShowBottomNav = ["/vocabulary", "/recommendations", "/news", "/user"].includes(pathname);

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
      <div className="h-screen flex flex-col">
        <main className="flex-grow h-0 pb-16">{children}</main>
        {shouldShowBottomNav && <BottomNavigation />}
      </div>
    </QueryClientProvider>
  ) : (
    <DeviceNotSupported />
  );
}
