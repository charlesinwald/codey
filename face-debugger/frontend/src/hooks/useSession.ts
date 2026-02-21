import { useState, useEffect, useCallback } from "react";

interface SessionState {
  sessionId: string | null;
  conversationUrl: string | null;
  conversationId: string | null;
  backendUrl: string;
  isLoading: boolean;
  error: string | null;
}

interface SessionStartResponse {
  session_id: string;
  conversation_url: string;
  conversation_id: string;
}

interface UseSessionReturn extends SessionState {
  initSession: () => Promise<void>;
  endSession: () => Promise<void>;
}

/**
 * Parse URL parameters for session info (from VS Code WebView).
 */
function getInitialStateFromUrl(): Partial<SessionState> {
  const params = new URLSearchParams(window.location.search);

  return {
    sessionId: params.get("sessionId"),
    conversationUrl: params.get("conversationUrl"),
    backendUrl:
      params.get("backendUrl") ||
      import.meta.env.VITE_BACKEND_URL ||
      "http://localhost:8000",
  };
}

/**
 * Listen for initialization messages from VS Code WebView parent.
 */
function listenForVSCodeInit(
  callback: (state: Partial<SessionState>) => void
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === "FACE_DEBUGGER_INIT") {
      callback({
        sessionId: event.data.state.sessionId,
        conversationUrl: event.data.state.conversationUrl,
        backendUrl: event.data.state.backendUrl,
      });
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

export function useSession(): UseSessionReturn {
  const initialState = getInitialStateFromUrl();

  const [state, setState] = useState<SessionState>({
    sessionId: initialState.sessionId || null,
    conversationUrl: initialState.conversationUrl || null,
    conversationId: null,
    backendUrl: initialState.backendUrl || "http://localhost:8000",
    isLoading: !initialState.sessionId || !initialState.conversationUrl,
    error: null,
  });

  /**
   * Initialize a new session with the backend.
   */
  const initSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${state.backendUrl}/session/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

      const data: SessionStartResponse = await response.json();

      setState((prev) => ({
        ...prev,
        sessionId: data.session_id,
        conversationUrl: data.conversation_url,
        conversationId: data.conversation_id,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect to backend";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [state.backendUrl]);

  /**
   * End the current session.
   */
  const endSession = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await fetch(`${state.backendUrl}/session/${state.sessionId}`, {
        method: "DELETE",
      });

      setState((prev) => ({
        ...prev,
        sessionId: null,
        conversationUrl: null,
        conversationId: null,
      }));
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  }, [state.sessionId, state.backendUrl]);

  // Listen for VS Code WebView messages
  useEffect(() => {
    const cleanup = listenForVSCodeInit((newState) => {
      setState((prev) => ({
        ...prev,
        ...newState,
        isLoading: false,
        error: null,
      }));
    });

    return cleanup;
  }, []);

  // Auto-init session if not provided via URL params
  useEffect(() => {
    if (state.isLoading && !state.sessionId && !state.conversationUrl) {
      // Small delay to allow VS Code init message to arrive first
      const timer = setTimeout(() => {
        if (!state.sessionId && !state.conversationUrl) {
          initSession();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [state.isLoading, state.sessionId, state.conversationUrl, initSession]);

  return {
    ...state,
    initSession,
    endSession,
  };
}
