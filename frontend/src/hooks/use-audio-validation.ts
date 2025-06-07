"use client";

import { useQuery } from "@tanstack/react-query";

interface AudioValidationData {
  newsId: string;
  audioUrl: string;
  contentType: string | null;
  contentLength: string | null;
  lastModified: string | null;
  isValid: boolean;
  validatedAt: string;
}

export const useAudioValidation = (audioUrl: string, newsId: string) => {
  return useQuery<AudioValidationData>({
    queryKey: ["audio-validation", newsId, audioUrl],
    queryFn: async (): Promise<AudioValidationData> => {
      const response = await fetch(audioUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        newsId,
        audioUrl,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        lastModified: response.headers.get("last-modified"),
        isValid: true,
        validatedAt: new Date().toISOString()
      };
    },
    enabled: !!audioUrl && !!newsId && typeof audioUrl === "string",
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    throwOnError: false
  });
};
