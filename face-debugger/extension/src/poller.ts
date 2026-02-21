/**
 * Polling logic for Face-to-Face Debugging extension.
 *
 * Polls the active editor every N seconds and sends content to the backend.
 */

import * as vscode from "vscode";

interface AnalyzeRequest {
  file_content: string;
  cursor_line: number;
  language: string;
  session_id: string;
}

interface AnalyzeResponse {
  speak: boolean;
  line?: string;
  reason?: string;
}

interface SessionStartResponse {
  session_id: string;
  active: boolean;
}

export class Poller {
  private context: vscode.ExtensionContext;
  private intervalId: NodeJS.Timeout | null = null;
  private running = false;
  private sessionId: string | null = null;

  // Configuration
  private backendUrl: string = "http://localhost:8000";
  private pollInterval: number = 4000; // 4 seconds - balanced for checking complete code blocks
  private ignoredLanguages: string[] = [
    "plaintext",
    "markdown",
    "json",
    "jsonc",
    "log",
  ];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadConfig();

    // Restore session ID from global state if available
    const savedSessionId = context.globalState.get<string>(
      "faceDebugger.sessionId"
    );
    if (savedSessionId) {
      this.sessionId = savedSessionId;
    }
  }

  /**
   * Load configuration from VS Code settings.
   */
  loadConfig(): void {
    const config = vscode.workspace.getConfiguration("faceDebugger");
    this.backendUrl = config.get<string>("backendUrl") || this.backendUrl;
    this.pollInterval = config.get<number>("pollInterval") || this.pollInterval;
    this.ignoredLanguages =
      config.get<string[]>("ignoredLanguages") || this.ignoredLanguages;
  }

  /**
   * Update configuration (called when settings change).
   */
  async updateConfig(): Promise<void> {
    const wasRunning = this.running;
    if (wasRunning) {
      await this.stop(false); // Don't clear session on config update
    }
    this.loadConfig();
    if (wasRunning) {
      await this.start();
    }
  }

  /**
   * Generate a new session ID.
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Start a new session with the backend.
   * Clears any existing session data first to ensure fresh state.
   */
  async startSession(): Promise<boolean> {
    // Clear existing session if we have one (to flush old errors)
    if (this.sessionId) {
      try {
        console.log(`Face Debugger: Clearing previous session ${this.sessionId} before starting new one`);
        await fetch(`${this.backendUrl}/session/${this.sessionId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.warn("Face Debugger: Error clearing previous session:", error);
        // Continue anyway - we'll create a new session
      }
    }

    // Generate new session ID if not already set
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
      await this.context.globalState.update(
        "faceDebugger.sessionId",
        this.sessionId
      );
    }

    try {
      const response = await fetch(`${this.backendUrl}/session/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: this.sessionId,
        }),
      });

      if (!response.ok) {
        console.error(
          `Face Debugger: Session start failed with status ${response.status}`
        );
        return false;
      }

      const data = (await response.json()) as SessionStartResponse;
      this.sessionId = data.session_id;

      // Update stored session ID
      await this.context.globalState.update(
        "faceDebugger.sessionId",
        this.sessionId
      );

      console.log(`Face Debugger: Session started - ${this.sessionId}`);
      return true;
    } catch (error) {
      console.error("Face Debugger: Failed to start session", error);
      return false;
    }
  }

  /**
   * Start polling.
   */
  async start(): Promise<boolean> {
    if (this.running) {
      return true;
    }

    // Start session if needed
    if (!this.sessionId) {
      const success = await this.startSession();
      if (!success) {
        return false;
      }
    }

    this.running = true;

    // Start polling interval
    this.intervalId = setInterval(() => {
      this.poll();
    }, this.pollInterval);

    // Do an immediate poll
    this.poll();

    console.log(
      `Face Debugger: Started polling every ${this.pollInterval}ms`
    );
    return true;
  }

  /**
   * Stop polling and optionally clear session history.
   */
  async stop(clearSession: boolean = true): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    console.log("Face Debugger: Stopped polling");

    // Clear session history when stopping
    if (clearSession && this.sessionId) {
      try {
        console.log(`Face Debugger: Clearing session history for ${this.sessionId}`);
        const response = await fetch(`${this.backendUrl}/session/${this.sessionId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          const data = (await response.json()) as { deleted_keys: number; session_id: string; message: string };
          console.log(`Face Debugger: Session cleared - ${data.deleted_keys} keys deleted`);
        } else {
          console.warn(`Face Debugger: Failed to clear session: ${response.status}`);
        }
      } catch (error) {
        console.error("Face Debugger: Error clearing session:", error);
      }
    }
  }

  /**
   * Check if polling is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get the backend URL.
   */
  getBackendUrl(): string {
    return this.backendUrl;
  }

  /**
   * Trigger an immediate poll.
   */
  pollNow(): void {
    if (this.running) {
      this.poll();
    }
  }

  /**
   * Perform a single poll of the active editor.
   */
  private async poll(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      return;
    }

    const document = editor.document;

    // Skip untitled/unsaved documents
    if (document.isUntitled) {
      return;
    }

    // Skip ignored languages
    if (this.ignoredLanguages.includes(document.languageId)) {
      return;
    }

    // Skip very large files (> 100KB)
    const content = document.getText();
    if (content.length > 100000) {
      console.log("Face Debugger: Skipping large file");
      return;
    }

    // Get cursor position (1-indexed line number)
    const cursorLine = editor.selection.active.line + 1;

    const request: AnalyzeRequest = {
      file_content: content,
      cursor_line: cursorLine,
      language: document.languageId,
      session_id: this.sessionId!,
    };

    try {
      console.log(`Face Debugger: Polling - file: ${document.fileName}, language: ${document.languageId}, cursor: ${cursorLine}, content length: ${content.length}`);
      
      const response = await fetch(`${this.backendUrl}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Face Debugger: Analyze failed with status ${response.status}: ${errorText}`
        );
        return;
      }

      const data = (await response.json()) as AnalyzeResponse;

      console.log(`Face Debugger: Response - speak: ${data.speak}, reason: ${data.reason || 'none'}, line: ${data.line ? `"${data.line.substring(0, 50)}..."` : 'null'}`);

      if (data.speak && data.line) {
        console.log(`Face Debugger: ✅ COMMENT RECEIVED: "${data.line}"`);
      } else if (data.reason) {
        console.log(`Face Debugger: ⚠️ Silent (${data.reason})`);
      } else {
        console.log(`Face Debugger: ⚠️ No response data`);
      }
    } catch (error) {
      console.error("Face Debugger: ❌ Poll failed", error);
    }
  }
}
