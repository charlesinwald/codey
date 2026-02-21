import { useEffect } from "react";
import { useSession } from "./hooks/useSession";
import { DebugSession } from "./components/DebugSession";

function App() {
  const { sessionId, backendUrl, isLoading, error, initSession } = useSession();

  useEffect(() => {
    // Notify parent (VS Code WebView) that we're ready
    if (window.parent !== window) {
      window.parent.postMessage({ type: "FACE_DEBUGGER_READY" }, "*");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-ide-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ide-surface border-t-ide-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ide-text-muted">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      
      <div className="flex items-center justify-center h-screen bg-ide-bg p-6">
        <div className="text-center max-w-md">
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
          <h2 className="text-xl font-semibold text-ide-text mb-2">
            Connection Error
          </h2>
          <p className="text-ide-text-muted mb-4">{error}</p>
          <button
            onClick={initSession}
            className="px-4 py-2 bg-ide-accent text-white rounded-lg hover:bg-ide-accent/80 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen bg-ide-bg p-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-ide-text mb-2">
            No Active Session
          </h2>
          <p className="text-ide-text-muted mb-4">
            Start a debugging session from VS Code to connect.
          </p>
          <button
            onClick={initSession}
            className="px-4 py-2 bg-ide-accent text-white rounded-lg hover:bg-ide-accent/80 transition-colors"
          >
            Start Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <DebugSession
      sessionId={sessionId}
      backendUrl={backendUrl}
      // Optional: provide a GLTF model URL for custom avatar
      // modelUrl="/models/avatar.glb"
    />
  );
}

export default App;
