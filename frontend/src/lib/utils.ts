import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mobile detection based on viewport width
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;

  // Mobile viewport breakpoint (matches Tailwind's sm breakpoint)
  return window.innerWidth < 640;
}

// Get current breakpoint based on screen size
export function getMobileBreakpoint(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";

  const width = window.innerWidth;

  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

// 難度顏色映射
export const getDifficultyColor = (difficulty: number) => {
  if (difficulty <= 3) return "bg-green-500";
  if (difficulty <= 6) return "bg-yellow-500";
  if (difficulty <= 8) return "bg-orange-500";
  return "bg-red-500";
};

// 將新聞等級映射到難度數值
export const mapLevelToDifficulty = (level: string): number => {
  switch (level) {
    case "beginner":
      return 1;
    case "intermediate":
      return 5;
    case "advanced":
      return 7;
    default:
      return 5; // fallback to intermediate
  }
};

// Generate Gravatar URL from email (async)
export const getGravatarUrl = async (
  email: string,
  size: number = 80
): Promise<string> => {
  if (typeof window === "undefined") {
    // Server-side fallback
    return `https://www.gravatar.com/avatar/default?s=${size}&d=mp`;
  }

  try {
    // Create MD5 hash of email
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());

    // Simple MD5 implementation for client-side
    const hashBuffer = await crypto.subtle.digest("MD5", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `https://www.gravatar.com/avatar/${hashHex}?s=${size}&d=mp`;
  } catch {
    // Fallback if crypto is not available
    return `https://www.gravatar.com/avatar/default?s=${size}&d=mp`;
  }
};

// Synchronous fallback for Gravatar (using a simple hash)
export const getGravatarUrlSync = (
  email: string,
  size: number = 80
): string => {
  // Simple hash function for fallback
  let hash = 0;
  const str = email.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hashHex = Math.abs(hash).toString(16);
  return `https://www.gravatar.com/avatar/${hashHex}?s=${size}&d=mp`;
};
