import { useState, useEffect, useCallback } from "react";
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { AvatarPanel } from "./AvatarPanel";
import { StatusBar } from "./StatusBar";

type Mode = "ambient" | "active";

interface DebugSessionProps {
  sessionId: string;
  conversationUrl: string;
  backendUrl: string;
}

interface SessionStatus {
  comment_count: number;
  last_comment: string | null;
  active: boolean;
}

export function DebugSession({
  sessionId,
  conversationUrl,
  backendUrl,
}: DebugSessionProps) {
  const [mode, setMode] = useState<Mode>("ambient");
  const [status, setStatus] = useState<SessionStatus>({
    comment_count: 0,
    last_comment: null,
    active: true,
  });

  /**
   * Fetch session status from backend.
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/session/${sessionId}/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus({
          comment_count: data.comment_count,
          last_comment: data.last_comment,
          active: data.active,
        });
      }
    } catch (err) {
      console.error("Failed to fetch session status:", err);
    }
  }, [backendUrl, sessionId]);

  // Poll status every 5 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleMode = () => {
    setMode((prev) => (prev === "ambient" ? "active" : "ambient"));
  };

  return (
    <div className="flex flex-col h-screen bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border bg-ide-surface">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-ide-success animate-pulse" />
          <span className="text-sm font-medium text-ide-text">
            Face Debugger
          </span>
        </div>

        {/* Mode Toggle */}
        <button
          onClick={toggleMode}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-full transition-colors
            ${
              mode === "ambient"
                ? "bg-ide-accent/20 text-ide-accent border border-ide-accent/30"
                : "bg-ide-success/20 text-ide-success border border-ide-success/30"
            }
          `}
        >
          {mode === "ambient" ? "Ambient Mode" : "Active Mode"}
        </button>
      </div>

      {/* Avatar Panel */}
      <div className="flex-1 relative overflow-hidden">
        <AvatarPanel conversationUrl={conversationUrl} />

        {/* Mode Indicator Overlay */}
        {mode === "ambient" && (
          <div className="absolute bottom-4 left-4 right-4 bg-ide-surface/90 backdrop-blur-sm rounded-lg p-3 border border-ide-border">
            <p className="text-xs text-ide-text-muted text-center">
              Watching your code... I'll speak up if I notice something.
            </p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        mode={mode}
        commentCount={status.comment_count}
        lastComment={status.last_comment}
      />

      {/* CopilotKit Popup for Active Mode */}
      {mode === "active" && (
        <CopilotPopup
          instructions="You are a grumpy but brilliant senior software engineer. Answer questions about code concisely. Two sentences max."
          labels={{
            title: "Ask the Debugger",
            initial: "What's on your mind?",
          }}
          defaultOpen={true}
          clickOutsideToClose={false}
        />
      )}
    </div>
  );
}
