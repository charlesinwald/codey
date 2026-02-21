import React from "react";
import ReactDOM from "react-dom/client";
import { CopilotKit } from "@copilotkit/react-core";
import App from "./App";
import "./index.css";

// Get backend URL from environment or query params
const getBackendUrl = (): string => {
  // Check query params first (from VS Code WebView)
  const params = new URLSearchParams(window.location.search);
  const paramUrl = params.get("backendUrl");
  if (paramUrl) {
    return paramUrl;
  }

  // Fall back to environment variable
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
};

const backendUrl = getBackendUrl();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CopilotKit runtimeUrl={`${backendUrl}/copilot`}>
      <App />
    </CopilotKit>
  </React.StrictMode>
);
