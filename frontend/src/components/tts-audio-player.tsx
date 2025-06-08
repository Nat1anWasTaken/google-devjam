"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { cn, formatTime } from "@/lib/utils";
import { AlertCircle, Pause, Play, RotateCcw, Settings, Volume2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface TtsAudioPlayerProps {
  text: string;
  newsId: string;
  className?: string;
}

interface WordHighlighterProps {
  words: string[];
  currentWordIndex: number;
  onWordClick: (wordIndex: number) => void;
  isPlaying: boolean;
}

const WordHighlighter: React.FC<WordHighlighterProps> = ({ words, currentWordIndex, onWordClick, isPlaying }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Auto-scroll to current word when it changes and is playing
  useEffect(() => {
    if (!isPlaying || currentWordIndex < 0 || currentWordIndex >= words.length) {
      return;
    }

    const container = containerRef.current;
    const currentWordElement = wordRefs.current[currentWordIndex];

    if (container && currentWordElement) {
      const containerRect = container.getBoundingClientRect();
      const wordRect = currentWordElement.getBoundingClientRect();

      // Calculate relative position within the container
      const relativeTop = wordRect.top - containerRect.top + container.scrollTop;
      const relativeBottom = relativeTop + wordRect.height;

      // Check if word is outside visible area
      const isAboveView = relativeTop < container.scrollTop;
      const isBelowView = relativeBottom > container.scrollTop + container.clientHeight;

      if (isAboveView || isBelowView) {
        // Calculate scroll position to center the word
        const scrollTop = relativeTop - container.clientHeight / 2 + wordRect.height / 2;

        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth"
        });
      }
    }
  }, [currentWordIndex, isPlaying, words.length]);

  // Initialize word refs array when words change
  useEffect(() => {
    wordRefs.current = wordRefs.current.slice(0, words.length);
  }, [words.length]);

  return (
    <div ref={containerRef} className="mt-4 p-4 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
      <div className="text-sm leading-relaxed select-none">
        {words.map((word, index) => (
          <React.Fragment key={index}>
            <span
              ref={(el) => {
                wordRefs.current[index] = el;
              }}
              className={cn(
                "cursor-pointer hover:bg-muted px-0.5 py-0.5 rounded transition-colors inline-block",
                index === currentWordIndex && isPlaying ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
              )}
              onClick={() => onWordClick(index)}
            >
              {word}
            </span>
            {index < words.length - 1 && <span className="inline-block w-1"> </span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const TtsAudioPlayer: React.FC<TtsAudioPlayerProps> = ({ text, newsId: _newsId, className }) => {
  const [showControls, setShowControls] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);

  const { state, controls, words, availableVoices, selectedVoiceIndex } = useTextToSpeech(text, {
    rate: speechRate
  });

  const { isPlaying, isPaused, currentWordIndex, progress, duration, isSupported, error, debugInfo } = state;

  // Show debug info automatically in development or when there's an error
  React.useEffect(() => {
    if (debugInfo?.environment === "development" || error) {
      setShowDebugInfo(true);
    }
  }, [debugInfo?.environment, error]);

  // Handle play/pause
  const handlePlayPause = () => {
    try {
      if (isPlaying) {
        controls.pause();
      } else {
        controls.play();
      }
    } catch (err) {
      toast.error(`播放失敗: ${err instanceof Error ? err.message : "未知錯誤"}`);
    }
  };

  // Handle progress bar change
  const handleProgressChange = (value: number[]) => {
    const percentage = value[0];
    const wordIndex = Math.floor((percentage / 100) * words.length);
    controls.seekToWord(wordIndex);
  };

  // Handle word click
  const handleWordClick = (wordIndex: number) => {
    controls.seekToWord(wordIndex);
  };

  // Handle rate change
  const handleRateChange = (value: number[]) => {
    const newRate = value[0];
    setSpeechRate(newRate);
    controls.setRate(newRate);
  };

  // Handle voice change
  const handleVoiceChange = (value: string) => {
    const voiceIndex = parseInt(value);
    controls.setVoice(voiceIndex);
  };

  // Calculate current time based on progress
  const currentTime = (progress / 100) * duration;

  // Show error if not supported
  if (!isSupported) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent>
          <div className="flex items-center space-x-4 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">您的瀏覽器不支援語音合成功能</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardContent>
        <div className="space-y-4">
          {/* Main Controls */}
          <div className="flex items-center space-x-4">
            {/* Play/Pause Button */}
            <div className="flex-shrink-0">
              {error ? (
                <Button variant="outline" size="icon" onClick={() => window.location.reload()} className="h-10 w-10">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="default" size="icon" onClick={handlePlayPause} disabled={!text || words.length === 0} className="h-10 w-10 text-foreground">
                  {isPlaying && !isPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </Button>
              )}
            </div>

            {/* Progress Section */}
            <div className="flex-1 space-y-2">
              {/* Progress Bar */}
              <div className="relative">
                <Slider value={[progress]} onValueChange={handleProgressChange} disabled={!text || words.length === 0 || !!error} max={100} step={1} className="w-full" />
              </div>

              {/* Time Display */}
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span className="w-12 text-left tabular-nums">{formatTime(currentTime)}</span>
                {error ? (
                  <div className="flex items-center space-x-1 text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-xs">{error}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="w-12 text-right tabular-nums">{formatTime(duration)}</span>
                    <span className="text-xs whitespace-nowrap">
                      ({Math.min(currentWordIndex + 1, words.length)}/{words.length} words)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Settings Button */}
            <div className="flex-shrink-0 flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={() => setShowControls(!showControls)} className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Advanced Controls */}
          {showControls && (
            <div className="space-y-3 pt-2 border-t">
              {/* Speed Control */}
              <div className="flex items-center space-x-3">
                <Label className="text-sm font-medium min-w-0">速度</Label>
                <Slider value={[speechRate]} onValueChange={handleRateChange} min={0.5} max={2} step={0.1} className="flex-1" />
                <span className="text-sm text-muted-foreground min-w-0">{speechRate.toFixed(1)}x</span>
              </div>

              {/* Voice Selection */}
              {availableVoices.length > 0 && (
                <div className="flex items-center space-x-3">
                  <Label className="text-sm font-medium min-w-0">語音</Label>
                  <Select value={selectedVoiceIndex.toString()} onValueChange={handleVoiceChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="選擇語音" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVoices.map((voice, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {voice.name} ({voice.lang})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Word Highlighter */}
          {words.length > 0 && <WordHighlighter words={words} currentWordIndex={currentWordIndex} onWordClick={handleWordClick} isPlaying={isPlaying} />}

          {/* Debug Information Panel */}
          {showDebugInfo && debugInfo && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Debug Information</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowDebugInfo(false)} className="h-6 px-2 text-xs">
                  Hide
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium">Environment:</span> {debugInfo.environment}
                </div>
                <div>
                  <span className="font-medium">HTTPS:</span> {debugInfo.isHttps ? "Yes" : "No"}
                </div>
                <div>
                  <span className="font-medium">Voices Loaded:</span> {debugInfo.voicesLoaded ? "Yes" : "No"}
                </div>
                <div>
                  <span className="font-medium">Voice Count:</span> {debugInfo.voiceCount}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Last Action:</span> {debugInfo.lastAction}
                </div>
                {debugInfo.lastError && (
                  <div className="col-span-2 text-destructive">
                    <span className="font-medium">Last Error:</span> {debugInfo.lastError}
                  </div>
                )}
                <div className="col-span-2 break-all">
                  <span className="font-medium">User Agent:</span> {debugInfo.userAgent.substring(0, 100)}...
                </div>
              </div>
              <div className="mt-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log("Full TTS Debug Info:", debugInfo);
                    console.log("Available Voices:", availableVoices);
                    console.log("TTS State:", state);
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Log Full Debug Info
                </Button>
              </div>
            </div>
          )}

          {/* Error with Debug Toggle */}
          {!showDebugInfo && (debugInfo?.environment === "production" || error) && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{error || "TTS is still WIP and might not work as expected"}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDebugInfo(true)} className="h-6 px-2 text-xs">
                  Show Debug Info
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TtsAudioPlayer;
