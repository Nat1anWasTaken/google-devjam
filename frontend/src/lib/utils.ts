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

// Helper function to auto-detect audio content type
export const detectAudioContentType = (audioUrl: string, headerContentType: string | null): string | null => {
  // Priority 1: Use content-type from HTTP headers if available and valid
  if (headerContentType) {
    const normalizedType = headerContentType.toLowerCase();

    // Validate that it's actually an audio type
    if (normalizedType.startsWith("audio/")) {
      return headerContentType;
    }

    // Handle some common non-audio content types that might actually be audio
    if (normalizedType.includes("application/octet-stream") || normalizedType.includes("binary/octet-stream")) {
      // Fall through to file extension detection
    } else if (normalizedType.includes("application/ogg")) {
      return "audio/ogg";
    } else if (normalizedType.includes("video/mp4") && audioUrl.toLowerCase().includes(".m4a")) {
      return "audio/mp4";
    }
  }

  // Priority 2: Detect from file extension
  const url = audioUrl.toLowerCase();
  const extensionMap: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".mpeg": "audio/mpeg",
    ".mpga": "audio/mpeg",
    ".wav": "audio/wav",
    ".wave": "audio/wav",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".m4a": "audio/mp4",
    ".mp4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    ".wma": "audio/x-ms-wma",
    ".webm": "audio/webm",
    ".opus": "audio/opus"
  };

  // Check for file extensions
  for (const [extension, mimeType] of Object.entries(extensionMap)) {
    if (url.includes(extension)) {
      return mimeType;
    }
  }

  // Priority 3: Check query parameters for format hints
  try {
    const urlObj = new URL(audioUrl);
    const format = urlObj.searchParams.get("format") || urlObj.searchParams.get("type");
    if (format) {
      const formatLower = format.toLowerCase();
      if (extensionMap[`.${formatLower}`]) {
        return extensionMap[`.${formatLower}`];
      }
    }
  } catch {
    // Invalid URL, ignore
  }

  // Priority 4: Analyze URL path patterns
  if (url.includes("mp3") || url.includes("mpeg")) {
    return "audio/mpeg";
  } else if (url.includes("wav") || url.includes("wave")) {
    return "audio/wav";
  } else if (url.includes("ogg")) {
    return "audio/ogg";
  } else if (url.includes("m4a") || url.includes("aac")) {
    return "audio/mp4";
  } else if (url.includes("flac")) {
    return "audio/flac";
  } else if (url.includes("webm")) {
    return "audio/webm";
  }

  // Priority 5: Default fallback based on common usage
  // MP3 is the most widely supported format
  return "audio/mpeg";
};

// Helper function to format time in mm:ss format
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
