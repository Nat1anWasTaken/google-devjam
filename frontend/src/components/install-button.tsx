"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function InstallButton({ variant = "default", size = "default", className }: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(isIOSDevice);

    // Check if app is already installed (standalone mode)
    const isInStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(isInStandalone);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  if (isInstallable && deferredPrompt) {
    return (
      <Button onClick={handleInstallClick} variant={variant} size={size} className={className}>
        <Download className="mr-2 h-4 w-4" />
        安裝 App
      </Button>
    );
  }

  if (isIOS) {
    return (
      <div className="space-y-2">
        <Button disabled variant={variant} size={size} className={className}>
          <Download className="mr-2 h-4 w-4" />
          安裝 App
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          在 Safari 中，點擊分享按鈕 <Share className="inline-block h-3 w-3" />
          ，然後選擇 &ldquo;加入主畫面&rdquo; <Plus className="inline-block h-3 w-3" />。
        </p>
      </div>
    );
  }

  return (
    <Button disabled variant={variant} size={size} className={className}>
      <Download className="mr-2 h-4 w-4" />
      安裝 App
    </Button>
  );
}
