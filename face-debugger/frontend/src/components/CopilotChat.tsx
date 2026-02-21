import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

interface CopilotChatProps {
  backendUrl: string;
  sessionId: string;
}

/**
 * CopilotKit chat component backed by the dedicated Node.js CopilotKit runtime
 * server (copilotkit-server.mjs), which uses AnthropicAdapter to talk to Claude.
 *
 * The Python FastAPI backend cannot serve the CopilotKit GraphQL protocol, so
 * this component points to the separate Node.js runtime on port 4000.
 */
export function CopilotChat({ backendUrl: _backendUrl, sessionId: _sessionId }: CopilotChatProps) {
  const runtimeUrl =
    import.meta.env.VITE_COPILOTKIT_RUNTIME_URL || "http://localhost:4000/copilotkit";

  return (
    <CopilotKit runtimeUrl={runtimeUrl}>
      <CopilotSidebar
        instructions="You are a helpful AI pair programmer. Help the user debug their code, answer questions, and provide suggestions. Be concise but thorough."
        labels={{
          title: "AI Assistant",
          initial:
            "Hi! I'm your AI pair programmer. I can help you debug code, answer questions, and provide suggestions. What would you like to know?",
        }}
        defaultOpen={false}
        clickOutsideToClose={true}
      />
    </CopilotKit>
  );
}
