"use client";

import { isMobile } from "@/lib/utils";
import { useEffect, useState } from "react";

interface PhoneViewportContainerProps {
  children: React.ReactNode;
}

export function PhoneViewportContainer({ children }: PhoneViewportContainerProps) {
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

  // On mobile devices, render full screen (native experience)
  if (mobile) {
    return <div className="h-screen flex flex-col">{children}</div>;
  }

  // On larger screens, render in a phone-sized container
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="relative">
        {/* Phone frame/shadow for visual appeal */}
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-2 shadow-2xl">
          {/* Phone screen container */}
          <div
            className="bg-black rounded-[2rem] overflow-hidden relative"
            style={{
              width: "375px",
              height: "812px" // iPhone 12/13/14 dimensions
            }}
          >
            {/* App content */}
            <div className="h-full flex flex-col bg-background text-foreground">{children}</div>
          </div>
        </div>

        {/* Optional: Phone details for realism */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
      </div>
    </div>
  );
}
