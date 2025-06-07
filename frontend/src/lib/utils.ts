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
