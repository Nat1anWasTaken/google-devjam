"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, AlertCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, detectAudioContentType, formatTime } from "@/lib/utils";
import { useAudioValidation } from "@/hooks/use-audio-validation";

interface AudioPlayerProps {
  audioUrl: string;
  newsId: string;
  className?: string;
}

// Helper function to extract detailed error information
const getDetailedErrorMessage = (error: Error | unknown, context: string, audioUrl: string, newsId: string): string => {
  let fullMessage = `${context} (新聞 ID: ${newsId})`;

  if (error && typeof error === "object" && "message" in error) {
    fullMessage += `: ${(error as Error).message}`;
  }

  if (error && typeof error === "object" && "name" in error && (error as Error).name !== "Error") {
    fullMessage += ` (${(error as Error).name})`;
  }

  if (error && typeof error === "object" && "code" in error) {
    fullMessage += ` [Code: ${(error as { code: unknown }).code}]`;
  }

  fullMessage += ` | URL: ${audioUrl}`;

  // Add helpful suggestions based on error type
  const errorMessage = error && typeof error === "object" && "message" in error ? (error as Error).message : "";
  const errorName = error && typeof error === "object" && "name" in error ? (error as Error).name : "";

  if (errorMessage?.includes("timeout") || errorName === "TimeoutError") {
    fullMessage += ` | 建議: 檢查網路連線或音訊檔案大小`;
  } else if (errorMessage?.includes("404") || errorMessage?.includes("Not Found")) {
    fullMessage += ` | 建議: 檢查音訊檔案是否存在`;
  } else if (errorMessage?.includes("CORS") || errorName === "TypeError") {
    fullMessage += ` | 建議: 音訊伺服器需要設定 CORS 標頭`;
  } else if (errorName === "NotAllowedError") {
    fullMessage += ` | 建議: 點擊播放按鈕開始播放`;
  } else if (errorName === "NotSupportedError") {
    fullMessage += ` | 建議: 瀏覽器不支援此音訊格式`;
  }

  return fullMessage;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, newsId, className }) => {
  // React Query for URL validation
  const { data: audioData, error: validationError, isLoading: isValidating, isError: hasValidationError, refetch: refetchValidation } = useAudioValidation(audioUrl, newsId);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);

  // Handle React Query validation errors
  useEffect(() => {
    if (hasValidationError && validationError) {
      let errorMessage = getDetailedErrorMessage(validationError, "音訊連結驗證失敗", audioUrl, newsId);
      errorMessage += ` | 已重試 2 次後失敗`;
      toast.error(errorMessage);
      setAudioError("驗證失敗");
    }
  }, [hasValidationError, validationError, audioUrl, newsId]);

  // Initialize audio element when validation succeeds
  useEffect(() => {
    if (audioData?.isValid && audioRef.current) {
      const audio = audioRef.current;

      // Reset states
      setAudioError(null);
      setIsAudioLoading(true);
      setIsAudioReady(false);

      // Set up event listeners
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setIsAudioReady(true);
        setIsAudioLoading(false);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handleError = (e: Event) => {
        const target = e.target as HTMLAudioElement;
        const error = target.error;
        let errorMessage = "音訊播放錯誤";

        if (error) {
          switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage += ": 播放被中止 (MEDIA_ERR_ABORTED)";
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage += `: 網路錯誤 (MEDIA_ERR_NETWORK) - ${error.message}`;
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage += `: 解碼錯誤 (MEDIA_ERR_DECODE) - ${error.message}`;
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage += `: 不支援的格式 (MEDIA_ERR_SRC_NOT_SUPPORTED) - ${error.message}`;
              break;
            default:
              errorMessage += `: ${error.message} (Code: ${error.code})`;
          }
        }

        errorMessage += ` | 新聞 ID: ${newsId} | URL: ${audioUrl}`;
        toast.error(errorMessage);
        setAudioError("播放錯誤");
        setIsAudioLoading(false);
        setIsPlaying(false);
      };

      const handleCanPlay = () => {
        setIsAudioLoading(false);
      };

      const handleLoadStart = () => {
        setIsAudioLoading(true);
      };

      // Add event listeners
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);
      audio.addEventListener("canplay", handleCanPlay);
      audio.addEventListener("loadstart", handleLoadStart);

      // Set audio source
      audio.src = audioUrl;

      // Auto-detect and set content type
      const detectedType = detectAudioContentType(audioUrl, audioData.contentType);
      if (detectedType) {
        audio.setAttribute("type", detectedType);
      }

      // Cleanup function
      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        audio.removeEventListener("canplay", handleCanPlay);
        audio.removeEventListener("loadstart", handleLoadStart);
      };
    }
  }, [audioData?.isValid, audioData?.contentType, audioUrl, newsId]);

  // Play/Pause handler
  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current || !isAudioReady) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error: unknown) {
      const errorMessage = getDetailedErrorMessage(error, "播放失敗", audioUrl, newsId);
      toast.error(errorMessage);
      setIsPlaying(false);
    }
  }, [isPlaying, isAudioReady, audioUrl, newsId]);

  // Progress bar change handler
  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!audioRef.current || !isAudioReady) return;

      const newTime = (parseFloat(e.target.value) / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration, isAudioReady]
  );

  // Retry handler
  const handleRetry = useCallback(() => {
    setAudioError(null);
    refetchValidation();
  }, [refetchValidation]);

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Determine if we should show loading state
  const isLoading = isValidating || isAudioLoading;

  // Determine if there's an error
  const hasError = hasValidationError || !!audioError;

  return (
    <Card className={cn("w-full", className)}>
      <CardContent>
        <div className="flex items-center space-x-4">
          {/* Play/Pause Button */}
          <div className="flex-shrink-0">
            {hasError ? (
              <Button variant="outline" size="icon" onClick={handleRetry} disabled={isLoading} className="h-10 w-10">
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="default" size="icon" onClick={handlePlayPause} disabled={isLoading || !isAudioReady} className="h-10 w-10 text-foreground">
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>
            )}
          </div>

          {/* Progress Section */}
          <div className="flex-1 space-y-2">
            {/* Progress Bar */}
            <div className="relative">
              <input
                ref={progressRef}
                type="range"
                min="0"
                max="100"
                value={progressPercentage}
                onChange={handleProgressChange}
                disabled={!isAudioReady || hasError}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
              />
            </div>

            {/* Time Display */}
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              {hasError ? (
                <div className="flex items-center space-x-1 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-xs">{audioError || "驗證失敗"}</span>
                </div>
              ) : (
                <span>{formatTime(duration)}</span>
              )}
            </div>
          </div>

          {/* Volume Icon (Visual only) */}
          <div className="flex-shrink-0">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio ref={audioRef} preload="metadata" className="hidden" />
      </CardContent>
    </Card>
  );
};

export default AudioPlayer;
