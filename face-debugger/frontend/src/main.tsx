import React from "react";
import ReactDOM from "react-dom/client";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import App from "./App";
import "./index.css";

// --- COPILOTKIT ADDED ---
const resolvedBackendUrl =
  (window as any).__FACE_DEBUGGER__?.backendUrl ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:8000";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* --- COPILOTKIT ADDED --- */}
    <CopilotKit runtimeUrl={`${resolvedBackendUrl}/copilotkit`}>
      <App />
    </CopilotKit>
  </React.StrictMode>
);
