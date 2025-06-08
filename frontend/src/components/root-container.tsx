"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "./bottom-navigation";
import { PhoneViewportContainer } from "./phone-viewport-container";

const queryClient = new QueryClient();

export function RootContainer({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // Check if we're on a page that should show bottom navigation
  const shouldShowBottomNav = ["/vocabulary", "/recommendations", "/news", "/user"].includes(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <PhoneViewportContainer>
        <main className="flex-grow h-0 pb-16">{children}</main>
        {shouldShowBottomNav && <BottomNavigation />}
      </PhoneViewportContainer>
    </QueryClientProvider>
  );
}
