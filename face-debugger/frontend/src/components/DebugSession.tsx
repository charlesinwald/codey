import { useState, useEffect, useCallback, useRef } from "react";
import { AvatarPanel } from "./AvatarPanel";
import { SpeechBubble } from "./SpeechBubble";
import { StatusBar } from "./StatusBar";
import { CopilotChat } from "./CopilotChat";
// import { useVoice } from "../hooks/useVoice"; // ElevenLabs TTS - commented out
import { usePersonality } from "../hooks/usePersonality";

interface DebugSessionProps {
  sessionId: string;
  backendUrl: string;
  modelUrl?: string;
  // enableVoice?: boolean; // ElevenLabs TTS - commented out
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
  // enableVoice = true, // ElevenLabs TTS - commented out
}: DebugSessionProps) {
  const [status, setStatus] = useState<SessionStatus>({
    comment_count: 0,
    last_comment: null,
    active: true,
  });
  const [currentSpeech, setCurrentSpeech] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechVisible, setSpeechVisible] = useState(false);
  // const [voiceEnabled, setVoiceEnabled] = useState(enableVoice); // ElevenLabs TTS - commented out

  // Use ref to track previous comment count to avoid stale closure issues
  const prevCommentCountRef = useRef(0);
  // Track the last spoken comment to avoid repeating the same message
  const lastSpokenCommentRef = useRef<string | null>(null);

  // ElevenLabs TTS - commented out
  // const { speak, stop: stopVoice, isPlaying: isVoicePlaying, isUnlocked, unlock, error: voiceError } = useVoice({
  //   backendUrl,
  //   onSpeakStart: () => setIsSpeaking(true),
  //   onSpeakEnd: () => {
  //     // Keep speaking state for a bit after voice ends for animation
  //     setTimeout(() => setIsSpeaking(false), 300);
  //   },
  // });

  // Personality hook
  const { personalities, currentPersonality, setPersonality, isLoading: personalityLoading } = usePersonality({
    backendUrl,
    sessionId,
  });

  /**
   * Trigger speech bubble for a new comment.
   * (ElevenLabs TTS commented out)
   */
  const triggerSpeech = useCallback((comment: string) => {
    setCurrentSpeech(comment);
    setIsSpeaking(true);
    setSpeechVisible(true);
    lastSpokenCommentRef.current = comment;

    // ElevenLabs TTS - commented out
    // if (voiceEnabled) {
    //   speak(comment);
    // }
  }, []); // [voiceEnabled, speak] - commented out

  /**
   * Fetch session status from backend.
   */
  const fetchStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const url = `${backendUrl}/session/${sessionId}/status`;
      const response = await fetch(url);

      if (response.ok) {
        const data: SessionStatus = await response.json();
        const prevCount = prevCommentCountRef.current;

        // Check if there's a new comment
        if (data.last_comment) {
          const isNewComment = data.comment_count > prevCount;
          const commentChanged = data.last_comment !== lastSpokenCommentRef.current;
          const isFirstLoad = prevCount === 0 && data.comment_count > 0;
          const hasNotSpokenYet = lastSpokenCommentRef.current === null && data.comment_count > 0;

          // Trigger on new comment or if comment text changed
          if (isNewComment || (isFirstLoad && commentChanged) || (hasNotSpokenYet && commentChanged) || (commentChanged && !isSpeaking)) {
            triggerSpeech(data.last_comment);
            prevCommentCountRef.current = data.comment_count;
            lastSpokenCommentRef.current = data.last_comment;
          } else {
            prevCommentCountRef.current = data.comment_count;
          }
        } else {
          prevCommentCountRef.current = data.comment_count;
        }

        setStatus({
          comment_count: data.comment_count,
          last_comment: data.last_comment,
          active: data.active,
        });
      }
    } catch {
      // Silently handle fetch errors
    }
  }, [backendUrl, sessionId, triggerSpeech, isSpeaking]);

  // Poll status to catch comments
  useEffect(() => {
    prevCommentCountRef.current = 0;
    lastSpokenCommentRef.current = null;
    fetchStatus();
    const interval = setInterval(fetchStatus, 500);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Handle speech completion
  const handleSpeechDismiss = useCallback(() => {
    setSpeechVisible(false);
    // stopVoice(); // ElevenLabs TTS - commented out
    setTimeout(() => setIsSpeaking(false), 500);
  }, []); // [stopVoice] - commented out

  // ElevenLabs TTS - commented out
  // const toggleVoice = useCallback(() => {
  //   unlock(); // Unlock audio on interaction
  //   setVoiceEnabled((prev) => !prev);
  //   if (isVoicePlaying) {
  //     stopVoice();
  //   }
  // }, [isVoicePlaying, stopVoice, unlock]);

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

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Personality selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="personality-select" className="text-xs text-ide-text-muted">
              Personality:
            </label>
            <select
              id="personality-select"
              value={currentPersonality}
              onChange={(e) => setPersonality(e.target.value)}
              disabled={personalityLoading || personalities.length === 0}
              className="px-2 py-1 text-xs bg-ide-surface border border-ide-border rounded text-ide-text 
                         hover:border-ide-accent focus:outline-none focus:ring-1 focus:ring-ide-accent
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
              title={
                personalityLoading
                  ? "Loading personalities..."
                  : personalities.length === 0
                  ? "No personalities available"
                  : "Select AI personality"
              }
            >
              {personalityLoading ? (
                <option value="">Loading...</option>
              ) : personalities.length === 0 ? (
                <option value="">No personalities</option>
              ) : (
                personalities.map((personality) => (
                  <option key={personality.id} value={personality.id}>
                    {personality.name}
                  </option>
                ))
              )}
            </select>
            {personalities.find((p) => p.id === currentPersonality) && (
              <span
                className="text-xs text-ide-text-muted max-w-[200px] truncate hidden sm:inline"
                title={personalities.find((p) => p.id === currentPersonality)?.description}
              >
                {personalities.find((p) => p.id === currentPersonality)?.description}
              </span>
            )}
          </div>

          {/* ElevenLabs TTS voice toggle - commented out */}
          {/* <button
            onClick={toggleVoice}
            className={`p-1.5 rounded transition-colors relative ${
              voiceEnabled
                ? "bg-ide-accent/20 text-ide-accent"
                : "text-ide-text-muted hover:text-ide-text"
            }`}
            title={
              !isUnlocked && voiceEnabled
                ? "Click to enable audio"
                : voiceEnabled
                ? "Voice enabled (click to mute)"
                : "Voice disabled (click to enable)"
            }
          >
            {voiceEnabled ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
            {voiceEnabled && !isUnlocked && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            )}
          </button>

          {voiceError && (
            <span className="text-xs text-yellow-500" title={voiceError}>
              !
            </span>
          )} */}

          {/* Session indicator */}
          <span className="text-xs text-ide-text-muted">
            {sessionId.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* CopilotKit Chat Integration */}
      <CopilotChat backendUrl={backendUrl} sessionId={sessionId} />

      {/* Avatar Panel with Speech Bubble */}
      <div className="flex-1 relative overflow-hidden">
        {/* onClick={unlock} - ElevenLabs TTS - commented out */}
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
          <div
            className="absolute bottom-4 left-4 right-4 bg-ide-surface/80 backdrop-blur-sm rounded-lg p-3 border border-ide-border"
            // onClick={unlock} - ElevenLabs TTS - commented out
          >
            <p className="text-xs text-ide-text-muted text-center">
              {/* ElevenLabs TTS - commented out */}
              {/* {voiceEnabled && !isUnlocked ? (
                <span className="text-yellow-500">Click anywhere to enable audio</span>
              ) : (
                "Watching your code... I'll speak up if I notice something."
              )} */}
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
