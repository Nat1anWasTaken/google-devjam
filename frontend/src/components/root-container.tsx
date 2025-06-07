"use client";

import { isMobile } from "@/lib/utils";
import { useEffect, useState } from "react";
import { DeviceNotSupported } from "./device-not-supported";

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
    <div className="h-screen w-screen">{children}</div>
  ) : (
    <DeviceNotSupported />
  );
}
