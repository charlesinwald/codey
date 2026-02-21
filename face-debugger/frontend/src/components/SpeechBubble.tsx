import { useEffect, useState } from "react";

interface SpeechBubbleProps {
  text: string | null;
  isVisible: boolean;
  onDismiss?: () => void;
  autoHideDelay?: number;
}

/**
 * Animated speech bubble for displaying AI comments.
 * Appears with a typing animation and auto-hides after a delay.
 */
export function SpeechBubble({
  text,
  isVisible,
  onDismiss,
  autoHideDelay = 8000,
}: SpeechBubbleProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Typing animation effect
  useEffect(() => {
    if (!text || !isVisible) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText("");

    let index = 0;
    const typingSpeed = 30; // ms per character

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [text, isVisible]);

  // Auto-hide after delay
  useEffect(() => {
    if (!isVisible || isTyping || !onDismiss) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [isVisible, isTyping, onDismiss, autoHideDelay]);

  if (!isVisible || !text) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 animate-fade-in">
      <div className="relative bg-ide-surface/95 backdrop-blur-md rounded-2xl border border-ide-border shadow-xl">
        {/* Speech bubble pointer */}
        <div className="absolute -top-2 left-8 w-4 h-4 bg-ide-surface/95 border-l border-t border-ide-border transform rotate-45" />

        {/* Content */}
        <div className="relative p-4">
          {/* Speaking indicator */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1">
              <span
                className={`w-2 h-2 rounded-full bg-ide-accent ${isTyping ? "animate-pulse" : ""}`}
              />
              <span
                className={`w-2 h-2 rounded-full bg-ide-accent ${isTyping ? "animate-pulse delay-75" : ""}`}
              />
              <span
                className={`w-2 h-2 rounded-full bg-ide-accent ${isTyping ? "animate-pulse delay-150" : ""}`}
              />
            </div>
            <span className="text-xs text-ide-text-muted uppercase tracking-wide">
              {isTyping ? "Speaking..." : "Said"}
            </span>
          </div>

          {/* Text content */}
          <p className="text-ide-text text-sm leading-relaxed">
            "{displayedText}
            {isTyping && (
              <span className="inline-block w-0.5 h-4 bg-ide-accent ml-0.5 animate-blink" />
            )}
            "
          </p>

          {/* Dismiss button */}
          {!isTyping && onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-ide-border/50 transition-colors"
              aria-label="Dismiss"
            >
              <svg
                className="w-4 h-4 text-ide-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Subtitle-style display for AI comments.
 * More minimal, appears at the bottom of the screen.
 */
export function SubtitleDisplay({
  text,
  isVisible,
}: {
  text: string | null;
  isVisible: boolean;
}) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!text || !isVisible) {
      setDisplayedText("");
      return;
    }

    let index = 0;
    const typingSpeed = 25;

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [text, isVisible]);

  if (!isVisible || !text) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      <p className="text-center text-white text-lg font-medium drop-shadow-lg">
        {displayedText}
      </p>
    </div>
  );
}
