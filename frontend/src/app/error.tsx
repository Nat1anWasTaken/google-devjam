"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("App Error:", error);
    }
  }, [error]);

  const handleReloadApp = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleReset = () => {
    reset();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto border-destructive/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-xl font-semibold">應用程式發生錯誤</CardTitle>
          <CardDescription className="text-muted-foreground">Something went wrong</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">很抱歉，應用程式遇到了一個問題。請嘗試以下操作來恢復正常使用。</p>

          {process.env.NODE_ENV === "development" && (
            <details className="bg-muted/50 p-3 rounded-md text-xs">
              <summary className="cursor-pointer font-medium mb-2">Error Details (Development)</summary>
              <pre className="whitespace-pre-wrap break-words">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={handleReset} className="w-full" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              重試
            </Button>

            <Button onClick={handleReloadApp} variant="outline" className="w-full" size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              重新載入應用程式
            </Button>

            <Button onClick={handleGoHome} variant="ghost" className="w-full" size="lg">
              <Home className="h-4 w-4 mr-2" />
              回到首頁
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
