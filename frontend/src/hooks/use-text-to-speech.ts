"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface TtsState {
  isPlaying: boolean;
  isPaused: boolean;
  currentWordIndex: number;
  progress: number;
  duration: number;
  isSupported: boolean;
  error: string | null;
  debugInfo?: {
    environment: string;
    isHttps: boolean;
    userAgent: string;
    voicesLoaded: boolean;
    voiceCount: number;
    lastAction: string;
    lastError: string | null;
  };
}

export interface TtsControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekToWord: (wordIndex: number) => void;
  setRate: (rate: number) => void;
  setVoice: (voiceIndex: number) => void;
}

export interface UseTextToSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export const useTextToSpeech = (text: string, options: UseTextToSpeechOptions = {}) => {
  const { rate = 1, pitch = 1, volume = 1 } = options;

  const [state, setState] = useState<TtsState>({
    isPlaying: false,
    isPaused: false,
    currentWordIndex: 0,
    progress: 0,
    duration: 0,
    isSupported: false,
    error: null
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [words, setWords] = useState<string[]>([]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentWordIndexRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const isPausingRef = useRef(false);

  // Debug logging function
  const debugLog = useCallback(
    (action: string, data?: Record<string, unknown>) => {
      const timestamp = new Date().toISOString();
      const environment = process.env.NODE_ENV || "unknown";
      console.log(`[TTS Debug ${timestamp}] ${action}:`, data);

      setState((prev) => ({
        ...prev,
        debugInfo: {
          ...prev.debugInfo,
          environment,
          isHttps: typeof window !== "undefined" ? window.location.protocol === "https:" : false,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          voicesLoaded: availableVoices.length > 0,
          voiceCount: availableVoices.length,
          lastAction: action,
          lastError: (typeof data?.error === "string" ? data.error : null) || prev.debugInfo?.lastError || null
        }
      }));
    },
    [availableVoices.length]
  );

  // Check browser support with enhanced debugging
  useEffect(() => {
    debugLog("Initializing TTS", {
      speechSynthesis: "speechSynthesis" in window,
      location: typeof window !== "undefined" ? window.location.href : "server",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown"
    });

    const supported = "speechSynthesis" in window;
    setState((prev) => ({ ...prev, isSupported: supported }));

    if (!supported) {
      const errorMsg = "Speech synthesis is not supported in this browser";
      debugLog("Browser not supported", { error: errorMsg });
      setState((prev) => ({
        ...prev,
        error: errorMsg
      }));
    } else {
      // Additional browser capability checks
      debugLog("Browser capabilities", {
        speechSynthesis: !!window.speechSynthesis,
        SpeechSynthesisUtterance: !!window.SpeechSynthesisUtterance,
        getVoices: !!window.speechSynthesis?.getVoices,
        speaking: window.speechSynthesis?.speaking,
        pending: window.speechSynthesis?.pending,
        paused: window.speechSynthesis?.paused
      });
    }
  }, [debugLog]);

  // Load English voices with enhanced debugging
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      debugLog("Voice loading skipped - no speechSynthesis");
      return;
    }

    const loadVoices = () => {
      try {
        const voices = speechSynthesis.getVoices();
        debugLog("Raw voices loaded", {
          totalVoices: voices.length,
          voicesList: voices.map((v) => ({ name: v.name, lang: v.lang, default: v.default, localService: v.localService }))
        });

        const englishVoices = voices
          .filter((voice) => voice.lang.startsWith("en"))
          .sort((a, b) => {
            // Prefer US English, then UK English, then others
            if (a.lang === "en-US" && b.lang !== "en-US") return -1;
            if (b.lang === "en-US" && a.lang !== "en-US") return 1;
            if (a.lang === "en-GB" && b.lang !== "en-GB") return -1;
            if (b.lang === "en-GB" && a.lang !== "en-GB") return 1;
            return a.name.localeCompare(b.name);
          });

        debugLog("English voices filtered", {
          englishVoiceCount: englishVoices.length,
          englishVoices: englishVoices.map((v) => ({ name: v.name, lang: v.lang, default: v.default }))
        });

        setAvailableVoices(englishVoices);

        // Update debug info with voice loading status
        setState((prev) => ({
          ...prev,
          debugInfo: {
            environment: prev.debugInfo?.environment || "unknown",
            isHttps: prev.debugInfo?.isHttps || false,
            userAgent: prev.debugInfo?.userAgent || "unknown",
            voicesLoaded: englishVoices.length > 0,
            voiceCount: englishVoices.length,
            lastAction: "voices_loaded",
            lastError: prev.debugInfo?.lastError || null
          }
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        debugLog("Voice loading error", { error: errorMessage });
        setState((prev) => ({
          ...prev,
          error: `Failed to load voices: ${errorMessage}`
        }));
      }
    };

    debugLog("Initial voice loading attempt");
    loadVoices();

    // Some browsers load voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      debugLog("Setting up onvoiceschanged listener");
      speechSynthesis.onvoiceschanged = () => {
        debugLog("onvoiceschanged event triggered");
        loadVoices();
      };
    } else {
      debugLog("onvoiceschanged not available");
    }

    // Retry voice loading after a delay (some browsers need this)
    const retryTimeout = setTimeout(() => {
      debugLog("Retry voice loading after timeout");
      loadVoices();
    }, 1000);

    return () => {
      clearTimeout(retryTimeout);
    };
  }, [debugLog]);

  // Process text into words
  useEffect(() => {
    if (!text) {
      setWords([]);
      return;
    }

    // Simple English word splitting
    const processedWords = text
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .map((word) => word.trim());

    setWords(processedWords);

    // Estimate duration (average reading speed: ~200 words per minute)
    const estimatedDuration = ((processedWords.length / 200) * 60) / rate;
    setState((prev) => ({ ...prev, duration: estimatedDuration }));
  }, [text, rate]);

  // Create and configure utterance with enhanced debugging
  const createUtterance = useCallback(
    (textToSpeak: string, startWordIndex: number = 0) => {
      debugLog("Creating utterance", {
        textLength: textToSpeak.length,
        startWordIndex,
        selectedVoice: availableVoices[selectedVoiceIndex]?.name || "none",
        parameters: { rate, pitch, volume }
      });

      if (!("speechSynthesis" in window)) {
        debugLog("utterance creation failed - no speechSynthesis");
        return null;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        // Set voice
        if (availableVoices[selectedVoiceIndex]) {
          utterance.voice = availableVoices[selectedVoiceIndex];
          debugLog("Voice set", { voiceName: utterance.voice.name, voiceLang: utterance.voice.lang });
        } else {
          debugLog("No voice selected or available", { availableCount: availableVoices.length, selectedIndex: selectedVoiceIndex });
        }

        // Set speech parameters
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        // Track word boundaries (not all browsers support this)
        utterance.onboundary = (event) => {
          debugLog("Word boundary event", { name: event.name, charIndex: event.charIndex });
          if (event.name === "word") {
            const wordIndex = startWordIndex + Math.floor(event.charIndex / 6); // Rough estimate
            currentWordIndexRef.current = Math.min(wordIndex, words.length - 1);

            setState((prev) => ({
              ...prev,
              currentWordIndex: currentWordIndexRef.current,
              progress: (currentWordIndexRef.current / words.length) * 100
            }));
          }
        };

        utterance.onstart = () => {
          debugLog("Speech started");
          startTimeRef.current = Date.now();
          setState((prev) => ({ ...prev, isPlaying: true, isPaused: false, error: null }));
        };

        utterance.onpause = () => {
          debugLog("Speech paused");
          pausedTimeRef.current = Date.now();
          setState((prev) => ({ ...prev, isPaused: true }));
        };

        utterance.onresume = () => {
          debugLog("Speech resumed");
          const pausedDuration = Date.now() - pausedTimeRef.current;
          startTimeRef.current += pausedDuration;
          setState((prev) => ({ ...prev, isPaused: false }));
        };

        utterance.onend = () => {
          debugLog("Speech ended");
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
            currentWordIndex: 0,
            progress: 0
          }));
          currentWordIndexRef.current = 0;
        };

        utterance.onerror = (event) => {
          debugLog("Speech error", {
            error: event.error,
            isPausingRef: isPausingRef.current,
            speechSynthesisState: {
              speaking: speechSynthesis.speaking,
              pending: speechSynthesis.pending,
              paused: speechSynthesis.paused
            }
          });

          // Don't treat "interrupted" as an error when we're intentionally pausing
          if (event.error === "interrupted" && isPausingRef.current) {
            isPausingRef.current = false;
            debugLog("Interrupted error ignored (intentional pause)");
            return;
          }

          const errorMessage = `Speech synthesis error: ${event.error}`;
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
            error: errorMessage
          }));
        };

        debugLog("Utterance created successfully");
        return utterance;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        debugLog("Utterance creation failed", { error: errorMessage });
        setState((prev) => ({
          ...prev,
          error: `Failed to create utterance: ${errorMessage}`
        }));
        return null;
      }
    },
    [availableVoices, selectedVoiceIndex, rate, pitch, volume, words.length, debugLog]
  );

  const controls: TtsControls = {
    play: () => {
      debugLog("Play button clicked", {
        isSupported: state.isSupported,
        hasText: !!text,
        wordCount: words.length,
        isPaused: state.isPaused,
        currentWordIndex: currentWordIndexRef.current,
        speechSynthesisState: {
          speaking: speechSynthesis.speaking,
          pending: speechSynthesis.pending,
          paused: speechSynthesis.paused
        }
      });

      if (!state.isSupported) {
        debugLog("Play aborted - not supported");
        return;
      }
      if (!text) {
        debugLog("Play aborted - no text");
        return;
      }
      if (words.length === 0) {
        debugLog("Play aborted - no words");
        return;
      }

      try {
        // Always cancel any existing speech
        if (speechSynthesis.speaking) {
          debugLog("Cancelling existing speech");
          speechSynthesis.cancel();
        }

        // Check user interaction requirement (required in many browsers)
        if (typeof window !== "undefined" && window.navigator.userActivation && !window.navigator.userActivation.hasBeenActive) {
          debugLog("User activation required but not present");
          setState((prev) => ({
            ...prev,
            error: "User interaction required. Please try clicking the play button again."
          }));
          return;
        }

        // Start from current position (either beginning or where we paused)
        const startIndex = state.isPaused ? currentWordIndexRef.current : 0;
        const textToSpeak = words.slice(startIndex).join(" ");

        debugLog("Starting speech", {
          startIndex,
          textToSpeakLength: textToSpeak.length,
          firstWords: textToSpeak.substring(0, 50) + "..."
        });

        const utterance = createUtterance(textToSpeak, startIndex);

        if (utterance) {
          utteranceRef.current = utterance;

          // Check if speech synthesis is ready
          if (speechSynthesis.speaking || speechSynthesis.pending) {
            debugLog("Speech synthesis busy, waiting...");
            setTimeout(() => {
              speechSynthesis.speak(utterance);
            }, 100);
          } else {
            debugLog("Speaking utterance");
            speechSynthesis.speak(utterance);
          }
        } else {
          debugLog("Failed to create utterance");
          setState((prev) => ({
            ...prev,
            error: "Failed to create speech utterance"
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        debugLog("Play error", { error: errorMessage });
        setState((prev) => ({
          ...prev,
          error: `Failed to play: ${errorMessage}`
        }));
      }
    },

    pause: () => {
      debugLog("Pause button clicked", {
        speechSynthesisState: {
          speaking: speechSynthesis.speaking,
          pending: speechSynthesis.pending,
          paused: speechSynthesis.paused
        }
      });

      try {
        if (speechSynthesis.speaking) {
          debugLog("Pausing speech");
          isPausingRef.current = true;
          speechSynthesis.cancel();
          setState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
        } else {
          debugLog("No speech to pause");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        debugLog("Pause error", { error: errorMessage });
      }
    },

    stop: () => {
      debugLog("Stop button clicked");

      try {
        speechSynthesis.cancel();
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentWordIndex: 0,
          progress: 0
        }));
        currentWordIndexRef.current = 0;
        debugLog("Speech stopped successfully");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        debugLog("Stop error", { error: errorMessage });
      }
    },

    seekToWord: (wordIndex: number) => {
      debugLog("Seek to word", { wordIndex, totalWords: words.length });

      if (wordIndex < 0 || wordIndex >= words.length) {
        debugLog("Invalid word index", { wordIndex, totalWords: words.length });
        return;
      }

      try {
        speechSynthesis.cancel();

        const textToSpeak = words.slice(wordIndex).join(" ");
        const utterance = createUtterance(textToSpeak, wordIndex);

        if (utterance) {
          utteranceRef.current = utterance;
          currentWordIndexRef.current = wordIndex;
          setState((prev) => ({
            ...prev,
            currentWordIndex: wordIndex,
            progress: (wordIndex / words.length) * 100
          }));
          speechSynthesis.speak(utterance);
          debugLog("Seek completed");
        } else {
          debugLog("Failed to create utterance for seek");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        debugLog("Seek error", { error: errorMessage });
      }
    },

    setRate: (newRate: number) => {
      const validatedRate = Math.max(0.1, Math.min(10, newRate));
      debugLog("Set rate", { requestedRate: newRate, validatedRate, isPlaying: state.isPlaying });

      // If currently playing, restart with new rate
      if (state.isPlaying) {
        const currentWordIndex = currentWordIndexRef.current;
        speechSynthesis.cancel();
        setTimeout(() => {
          controls.seekToWord(currentWordIndex);
        }, 100);
      }
    },

    setVoice: (voiceIndex: number) => {
      debugLog("Set voice", {
        voiceIndex,
        availableVoices: availableVoices.length,
        currentVoice: availableVoices[selectedVoiceIndex]?.name,
        newVoice: availableVoices[voiceIndex]?.name
      });

      if (voiceIndex >= 0 && voiceIndex < availableVoices.length) {
        try {
          // Always cancel any existing speech first
          speechSynthesis.cancel();

          // Clean up all refs and state
          utteranceRef.current = null;
          currentWordIndexRef.current = 0;
          isPausingRef.current = false;

          // Update voice selection
          setSelectedVoiceIndex(voiceIndex);

          // Reset state to clean state
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
            currentWordIndex: 0,
            progress: 0,
            error: null
          }));

          // If was playing before, restart from beginning with new voice
          if (state.isPlaying) {
            debugLog("Restarting speech with new voice");
            // Small delay to ensure cleanup is complete
            setTimeout(() => {
              controls.play();
            }, 150);
          }

          debugLog("Voice changed successfully");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          debugLog("Voice change error", { error: errorMessage });
        }
      } else {
        debugLog("Invalid voice index", { voiceIndex, availableCount: availableVoices.length });
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  return {
    state,
    controls,
    words,
    availableVoices,
    selectedVoiceIndex
  };
};
