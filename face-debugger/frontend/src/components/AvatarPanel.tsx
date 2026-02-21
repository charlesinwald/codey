import { useState, useEffect, useRef } from "react";

interface AvatarPanelProps {
  conversationUrl: string;
}

/**
 * Renders the Tavus CVI avatar in an iframe.
 *
 * The Tavus conversation URL embeds a Daily.co video room with the
 * AI avatar. The avatar speaks when triggered by the backend via
 * the Tavus /say endpoint.
 */
export function AvatarPanel({ conversationUrl }: AvatarPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Reset states when URL changes
    setIsLoading(true);
    setError(null);
  }, [conversationUrl]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load avatar. Please check your connection.");
  };

  return (
    <div className="w-full h-full relative bg-ide-bg">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-ide-bg z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-ide-surface border-t-ide-accent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-ide-text-muted">Connecting to avatar...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-ide-bg z-10">
          <div className="text-center p-6">
            <div className="w-16 h-16 rounded-full bg-ide-error/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-ide-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-ide-text-muted">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                if (iframeRef.current) {
                  iframeRef.current.src = conversationUrl;
                }
              }}
              className="mt-4 px-4 py-2 bg-ide-accent text-white rounded-lg hover:bg-ide-accent/80 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Avatar iframe */}
      <iframe
        ref={iframeRef}
        src={conversationUrl}
        className="w-full h-full border-none"
        allow="camera; microphone; display-capture; autoplay"
        onLoad={handleLoad}
        onError={handleError}
        title="Face Debugger Avatar"
      />

      {/* Mute indicator overlay */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          className="p-2 rounded-full bg-ide-surface/80 backdrop-blur-sm border border-ide-border hover:bg-ide-surface transition-colors"
          title="Audio settings are managed by Tavus"
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
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
