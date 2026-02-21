import { useState, useEffect, useCallback } from "react";

export interface Personality {
  id: string;
  name: string;
  description: string;
}

interface UsePersonalityOptions {
  backendUrl: string;
  sessionId: string | null;
}

interface UsePersonalityReturn {
  personalities: Personality[];
  currentPersonality: string;
  setPersonality: (personality: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function usePersonality({
  backendUrl,
  sessionId,
}: UsePersonalityOptions): UsePersonalityReturn {
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [currentPersonality, setCurrentPersonality] = useState<string>("grumpy");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available personalities
  useEffect(() => {
    const fetchPersonalities = async () => {
      try {
        const response = await fetch(`${backendUrl}/personalities`);
        if (response.ok) {
          const data = await response.json();
          setPersonalities(data.personalities);
          setCurrentPersonality(data.default);
        }
      } catch {
        setError("Failed to load personalities");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonalities();
  }, [backendUrl]);

  // Fetch session's current personality
  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionPersonality = async () => {
      try {
        const response = await fetch(
          `${backendUrl}/session/${sessionId}/personality`
        );
        if (response.ok) {
          const data = await response.json();
          setCurrentPersonality(data.personality);
        }
      } catch {
        // Ignore - use default
      }
    };

    fetchSessionPersonality();
  }, [backendUrl, sessionId]);

  // Set personality for session
  const setPersonality = useCallback(
    async (personality: string) => {
      if (!sessionId) return;

      setError(null);

      try {
        const response = await fetch(
          `${backendUrl}/session/${sessionId}/personality`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ personality }),
          }
        );

        if (response.ok) {
          setCurrentPersonality(personality);
        } else {
          const data = await response.json();
          setError(data.detail || "Failed to set personality");
        }
      } catch {
        setError("Failed to set personality");
      }
    },
    [backendUrl, sessionId]
  );

  return {
    personalities,
    currentPersonality,
    setPersonality,
    isLoading,
    error,
  };
}
