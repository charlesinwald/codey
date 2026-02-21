interface StatusBarProps {
  mode: "ambient" | "active";
  commentCount: number;
  lastComment: string | null;
}

export function StatusBar({ mode, commentCount, lastComment }: StatusBarProps) {
  return (
    <div className="px-4 py-2 bg-ide-surface border-t border-ide-border">
      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs">
        {/* Mode Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`
              w-2 h-2 rounded-full
              ${mode === "ambient" ? "bg-ide-accent" : "bg-ide-success"}
            `}
          />
          <span className="text-ide-text-muted uppercase tracking-wide">
            {mode}
          </span>
        </div>

        {/* Comment Count */}
        <div className="flex items-center gap-1.5 text-ide-text-muted">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{commentCount} comments</span>
        </div>
      </div>

      {/* Last Comment */}
      {lastComment && (
        <div className="mt-2 pt-2 border-t border-ide-border">
          <p className="text-xs text-ide-text-muted truncate" title={lastComment}>
            <span className="text-ide-text">Last:</span> "{lastComment}"
          </p>
        </div>
      )}
    </div>
  );
}
