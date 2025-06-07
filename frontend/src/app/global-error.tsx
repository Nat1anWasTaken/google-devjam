"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Global App Error:", error);
    }
  }, [error]);

  const handleReloadApp = () => {
    window.location.reload();
  };

  const handleReset = () => {
    reset();
  };

  return (
    <html className="dark">
      <body className="bg-background text-foreground antialiased">
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md mx-auto border-destructive/20">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-destructive" />
              </div>
              <CardTitle className="text-xl font-semibold">系統發生嚴重錯誤</CardTitle>
              <CardDescription className="text-muted-foreground">Critical system error</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">很抱歉，系統遇到了嚴重問題。請重新載入應用程式來恢復正常使用。</p>

              {process.env.NODE_ENV === "development" && (
                <details className="bg-muted/50 p-3 rounded-md text-xs">
                  <summary className="cursor-pointer font-medium mb-2">Global Error Details (Development)</summary>
                  <pre className="whitespace-pre-wrap break-words">
                    {error.message}
                    {error.digest && `\nDigest: ${error.digest}`}
                    {error.stack && `\nStack: ${error.stack}`}
                  </pre>
                </details>
              )}

              <div className="flex flex-col gap-3">
                <Button onClick={handleReset} className="w-full" size="lg">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重試 / Try Again
                </Button>

                <Button onClick={handleReloadApp} variant="outline" className="w-full" size="lg">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新載入應用程式 / Reload App
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
