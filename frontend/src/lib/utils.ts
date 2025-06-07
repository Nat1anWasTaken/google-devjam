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
export const mapLevelToDifficulty = (level: number | string): number => {
  // Handle numeric levels (1-10 scale)
  if (typeof level === "number") {
    return level;
  }

  // Handle string levels (legacy support)
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

// Helper function to format time in mm:ss format
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
