"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

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
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // For iOS devices, show prompt if not in standalone mode
    if (isIOSDevice && !isInStandalone) {
      setShowPrompt(true);
    }

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
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Hide for 24 hours
    localStorage.setItem("install-prompt-dismissed", Date.now().toString());
  };

  // Check if prompt was recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem("install-prompt-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < twentyFourHours) {
        setShowPrompt(false);
        return;
      }
    }
  }, []);

  // Don't show if already installed
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            <CardTitle className="text-base">Install LexLoop</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Get the full app experience with offline access and faster loading.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isInstallable && deferredPrompt ? (
          <Button onClick={handleInstallClick} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        ) : isIOS ? (
          <div className="space-y-2">
            <Button disabled className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
            <p className="text-xs text-muted-foreground">
              To install: Tap the Share button <span className="inline-block">📤</span> in Safari, then select &ldquo;Add to Home Screen&rdquo; <span className="inline-block">➕</span>
            </p>
          </div>
        ) : (
          <Button disabled className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
