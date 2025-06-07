"use client";

import { getStoredToken, isTokenValid } from "./api/auth";

export interface AuthDebugInfo {
  hasToken: boolean;
  tokenValid: boolean;
  tokenLength?: number;
  tokenExpiry?: Date | null;
  currentTime: Date;
}

export function getAuthDebugInfo(): AuthDebugInfo {
  const token = getStoredToken();
  const currentTime = new Date();

  if (!token) {
    return {
      hasToken: false,
      tokenValid: false,
      currentTime
    };
  }

  let tokenExpiry: Date | null = null;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        tokenExpiry = new Date(payload.exp * 1000);
      }
    }
  } catch (error) {
    console.warn("Failed to parse token for debug info:", error);
  }

  return {
    hasToken: true,
    tokenValid: isTokenValid(),
    tokenLength: token.length,
    tokenExpiry,
    currentTime
  };
}

export function logAuthDebugInfo(context: string = "Auth Debug"): void {
  const debugInfo = getAuthDebugInfo();

  console.group(`🔐 ${context}`);
  console.log("Has Token:", debugInfo.hasToken);
  console.log("Token Valid:", debugInfo.tokenValid);

  if (debugInfo.hasToken) {
    console.log("Token Length:", debugInfo.tokenLength);
    console.log("Token Expiry:", debugInfo.tokenExpiry);
    console.log("Current Time:", debugInfo.currentTime);

    if (debugInfo.tokenExpiry) {
      const timeUntilExpiry = debugInfo.tokenExpiry.getTime() - debugInfo.currentTime.getTime();
      console.log("Time Until Expiry:", `${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
    }
  }

  console.groupEnd();
}
