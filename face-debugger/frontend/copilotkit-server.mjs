/**
 * CopilotKit runtime server using @copilotkit/runtime + AnthropicAdapter.
 *
 * This is the proper way to self-host CopilotKit's backend. The Python
 * FastAPI backend cannot serve the CopilotKit GraphQL protocol — a dedicated
 * Node.js server is required.
 *
 * Start with: node --env-file=../backend/.env copilotkit-server.mjs
 * Or via npm:  npm run start:runtime
 */

import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from "@copilotkit/runtime";
import * as http from "http";

const serviceAdapter = new AnthropicAdapter({
  model: process.env.CLAUDE_MODEL || "claude-opus-4-6",
});

const runtime = new CopilotRuntime();
const PORT = process.env.COPILOTKIT_PORT || 4000;
const ENDPOINT = "/copilotkit";

const server = http.createServer((req, res) => {
  // CORS headers — allow the Vite dev server and VS Code WebView
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const handleRequest = copilotRuntimeNodeHttpEndpoint({
    endpoint: ENDPOINT,
    runtime,
    serviceAdapter,
  });

  return handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(
    `CopilotKit runtime running on http://localhost:${PORT}${ENDPOINT}`
  );
});
