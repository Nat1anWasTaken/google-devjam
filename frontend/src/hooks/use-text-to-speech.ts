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

  // Check browser support
  useEffect(() => {
    const supported = "speechSynthesis" in window;
    setState((prev) => ({ ...prev, isSupported: supported }));

    if (!supported) {
      setState((prev) => ({
        ...prev,
        error: "Speech synthesis is not supported in this browser"
      }));
    }
  }, []);

  // Load English voices
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
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

      setAvailableVoices(englishVoices);
    };

    loadVoices();

    // Some browsers load voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

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

  // Create and configure utterance
  const createUtterance = useCallback(
    (textToSpeak: string, startWordIndex: number = 0) => {
      if (!("speechSynthesis" in window)) return null;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Set voice
      if (availableVoices[selectedVoiceIndex]) {
        utterance.voice = availableVoices[selectedVoiceIndex];
      }

      // Set speech parameters
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Track word boundaries (not all browsers support this)
      utterance.onboundary = (event) => {
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
        startTimeRef.current = Date.now();
        setState((prev) => ({ ...prev, isPlaying: true, isPaused: false, error: null }));
      };

      utterance.onpause = () => {
        pausedTimeRef.current = Date.now();
        setState((prev) => ({ ...prev, isPaused: true }));
      };

      utterance.onresume = () => {
        const pausedDuration = Date.now() - pausedTimeRef.current;
        startTimeRef.current += pausedDuration;
        setState((prev) => ({ ...prev, isPaused: false }));
      };

      utterance.onend = () => {
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
        // Don't treat "interrupted" as an error when we're intentionally pausing
        if (event.error === "interrupted" && isPausingRef.current) {
          isPausingRef.current = false;
          return;
        }

        setState((prev) => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          error: `Speech synthesis error: ${event.error}`
        }));
      };

      return utterance;
    },
    [availableVoices, selectedVoiceIndex, rate, pitch, volume, words.length]
  );

  const controls: TtsControls = {
    play: () => {
      if (!state.isSupported || !text || words.length === 0) return;

      // Always cancel any existing speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      // Start from current position (either beginning or where we paused)
      const startIndex = state.isPaused ? currentWordIndexRef.current : 0;
      const textToSpeak = words.slice(startIndex).join(" ");
      const utterance = createUtterance(textToSpeak, startIndex);

      if (utterance) {
        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
      }
    },

    pause: () => {
      if (speechSynthesis.speaking) {
        isPausingRef.current = true;
        speechSynthesis.cancel();
        setState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
      }
    },

    stop: () => {
      speechSynthesis.cancel();
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentWordIndex: 0,
        progress: 0
      }));
      currentWordIndexRef.current = 0;
    },

    seekToWord: (wordIndex: number) => {
      if (wordIndex < 0 || wordIndex >= words.length) return;

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
      }
    },

    setRate: (newRate: number) => {
      Math.max(0.1, Math.min(10, newRate)); // Validate rate bounds
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
      if (voiceIndex >= 0 && voiceIndex < availableVoices.length) {
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
          // Small delay to ensure cleanup is complete
          setTimeout(() => {
            controls.play();
          }, 150);
        }
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
