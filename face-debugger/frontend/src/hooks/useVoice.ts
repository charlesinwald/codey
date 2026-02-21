import { useCallback, useRef, useState, useEffect } from "react";

interface UseVoiceOptions {
  backendUrl: string;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onError?: (error: Error) => void;
}

interface UseVoiceReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  isUnlocked: boolean;
  unlock: () => void;
}

/**
 * Hook for text-to-speech using ElevenLabs via the backend.
 */
export function useVoice({
  backendUrl,
  onSpeakStart,
  onSpeakEnd,
  onError,
}: UseVoiceOptions): UseVoiceReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Unlock audio on user interaction (required for autoplay policy)
  const unlock = useCallback(() => {
    if (isUnlocked) return;

    // Create and resume AudioContext to unlock audio
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = ctx;

      // Play a silent buffer to unlock
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      // Also try playing a silent audio element
      const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
      silentAudio.play().catch(() => {});

      setIsUnlocked(true);
    } catch {
      // Ignore errors, we'll try again on next interaction
    }
  }, [isUnlocked]);

  // Try to unlock on any click/touch
  useEffect(() => {
    const handleInteraction = () => unlock();
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });
    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [unlock]);

  /**
   * Stop any currently playing audio.
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  /**
   * Speak the given text using TTS.
   */
  const speak = useCallback(
    async (text: string) => {
      // Stop any existing playback
      stop();

      if (!text.trim()) return;

      setIsLoading(true);
      setError(null);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${backendUrl}/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `TTS failed: ${response.status}`);
        }

        // Get audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play audio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsPlaying(true);
          setIsLoading(false);
          onSpeakStart?.();
        };

        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          onSpeakEnd?.();
        };

        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
          setIsLoading(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          const err = new Error("Audio playback failed");
          setError(err.message);
          onError?.(err);
        };

        // Try to play - handle autoplay restrictions
        try {
          await audio.play();
          setIsUnlocked(true);
        } catch (playError) {
          console.warn("Audio autoplay blocked:", playError);
          setIsLoading(false);
          setError("Click anywhere to enable audio");
          // Don't call onError - this is expected behavior
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was aborted, ignore
          return;
        }

        console.error("TTS error:", err);
        setIsLoading(false);
        const error = err instanceof Error ? err : new Error("TTS failed");
        setError(error.message);
        onError?.(error);
      }
    },
    [backendUrl, stop, onSpeakStart, onSpeakEnd, onError]
  );

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    error,
    isUnlocked,
    unlock,
  };
}
