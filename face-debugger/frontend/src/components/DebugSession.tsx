import { useState, useEffect, useCallback } from "react";
import { AvatarPanel } from "./AvatarPanel";
import { SpeechBubble } from "./SpeechBubble";
import { StatusBar } from "./StatusBar";

interface DebugSessionProps {
  sessionId: string;
  backendUrl: string;
  modelUrl?: string;
}

interface SessionStatus {
  comment_count: number;
  last_comment: string | null;
  active: boolean;
}

export function DebugSession({
  sessionId,
  backendUrl,
  modelUrl,
}: DebugSessionProps) {
  const [status, setStatus] = useState<SessionStatus>({
    comment_count: 0,
    last_comment: null,
    active: true,
  });
  const [currentSpeech, setCurrentSpeech] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechVisible, setSpeechVisible] = useState(false);
  const [prevCommentCount, setPrevCommentCount] = useState(0);

  /**
   * Fetch session status from backend.
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/session/${sessionId}/status`);
      if (response.ok) {
        const data: SessionStatus = await response.json();

        // Check if there's a new comment
        if (data.last_comment && data.comment_count > prevCommentCount) {
          // New comment received - trigger speech
          setCurrentSpeech(data.last_comment);
          setIsSpeaking(true);
          setSpeechVisible(true);
          setPrevCommentCount(data.comment_count);
        }

        setStatus({
          comment_count: data.comment_count,
          last_comment: data.last_comment,
          active: data.active,
        });
      }
    } catch (err) {
      console.error("Failed to fetch session status:", err);
    }
  }, [backendUrl, sessionId, prevCommentCount]);

  // Poll status every 3 seconds to check for new comments
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Handle speech completion (auto-hide after typing finishes)
  const handleSpeechDismiss = useCallback(() => {
    setSpeechVisible(false);
    // Keep isSpeaking true for a brief moment after text disappears
    setTimeout(() => setIsSpeaking(false), 500);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border bg-ide-surface">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              status.active ? "bg-ide-success animate-pulse" : "bg-ide-error"
            }`}
          />
          <span className="text-sm font-medium text-ide-text">
            Face Debugger
          </span>
        </div>

        {/* Session indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ide-text-muted">
            Session: {sessionId.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* Avatar Panel with Speech Bubble */}
      <div className="flex-1 relative overflow-hidden">
        <AvatarPanel isSpeaking={isSpeaking} modelUrl={modelUrl} />

        {/* Speech Bubble Overlay */}
        <SpeechBubble
          text={currentSpeech}
          isVisible={speechVisible}
          onDismiss={handleSpeechDismiss}
          autoHideDelay={10000}
        />

        {/* Idle state message */}
        {!speechVisible && !isSpeaking && (
          <div className="absolute bottom-4 left-4 right-4 bg-ide-surface/80 backdrop-blur-sm rounded-lg p-3 border border-ide-border">
            <p className="text-xs text-ide-text-muted text-center">
              Watching your code... I'll speak up if I notice something.
            </p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        mode="ambient"
        commentCount={status.comment_count}
        lastComment={status.last_comment}
      />
    </div>
  );
}
