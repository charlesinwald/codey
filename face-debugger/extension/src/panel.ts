/**
 * WebView panel for Face-to-Face Debugging avatar UI.
 *
 * Renders the React frontend in a VS Code sidebar panel.
 */

import * as vscode from "vscode";

interface PanelConfig {
  sessionId: string;
  conversationUrl: string;
  backendUrl: string;
}

export class AvatarPanel {
  public static currentPanel: AvatarPanel | undefined;
  public static readonly viewType = "faceDebugger.avatarPanel";

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private config: PanelConfig;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    config: PanelConfig
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.config = config;

    // Set initial HTML content
    this.update();

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle visibility changes
    this.panel.onDidChangeViewState(
      () => {
        if (this.panel.visible) {
          this.update();
        }
      },
      null,
      this.disposables
    );

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "ready":
            console.log("Face Debugger: WebView ready");
            break;
          case "error":
            vscode.window.showErrorMessage(
              `Face Debugger: ${message.text}`
            );
            break;
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Create or show the avatar panel.
   */
  public static createOrShow(
    context: vscode.ExtensionContext,
    config: PanelConfig
  ): void {
    const column = vscode.ViewColumn.Beside;

    // If panel already exists, reveal it
    if (AvatarPanel.currentPanel) {
      AvatarPanel.currentPanel.config = config;
      AvatarPanel.currentPanel.panel.reveal(column);
      AvatarPanel.currentPanel.update();
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      AvatarPanel.viewType,
      "Face Debugger",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    AvatarPanel.currentPanel = new AvatarPanel(
      panel,
      context.extensionUri,
      config
    );
  }

  /**
   * Update the webview content.
   */
  private update(): void {
    this.panel.webview.html = this.getHtmlContent();
  }

  /**
   * Get the HTML content for the webview.
   */
  private getHtmlContent(): string {
    const config = vscode.workspace.getConfiguration("faceDebugger");
    const frontendUrl =
      config.get<string>("frontendUrl") || "http://localhost:5173";

    // Create initial state object to pass to the frontend
    const initialState = {
      sessionId: this.config.sessionId,
      conversationUrl: this.config.conversationUrl,
      backendUrl: this.config.backendUrl,
      isVSCode: true,
    };

    // For development, we embed the Vite dev server in an iframe
    // For production, you would bundle the frontend and serve it directly

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    frame-src ${frontendUrl} https://*.daily.co https://*.tavus.io https://tavusapi.com;
    script-src 'unsafe-inline';
    style-src 'unsafe-inline';
    connect-src ${this.config.backendUrl};
  ">
  <title>Face Debugger</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #0F172A;
    }
    #container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    #avatar-frame {
      flex: 1;
      width: 100%;
      border: none;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #94A3B8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      text-align: center;
    }
    #loading.hidden {
      display: none;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #1E293B;
      border-top: 3px solid #3B82F6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="loading">
      <div class="spinner"></div>
      <div>Loading avatar...</div>
    </div>
    <iframe
      id="avatar-frame"
      src="${frontendUrl}?sessionId=${encodeURIComponent(this.config.sessionId)}&conversationUrl=${encodeURIComponent(this.config.conversationUrl)}&backendUrl=${encodeURIComponent(this.config.backendUrl)}&isVSCode=true"
      allow="camera; microphone; display-capture"
      onload="document.getElementById('loading').classList.add('hidden')"
    ></iframe>
  </div>
  <script>
    (function() {
      const vscode = acquireVsCodeApi();

      // Notify extension that webview is ready
      vscode.postMessage({ command: 'ready' });

      // Handle iframe load errors
      const iframe = document.getElementById('avatar-frame');
      iframe.onerror = function() {
        vscode.postMessage({
          command: 'error',
          text: 'Failed to load avatar UI. Make sure the frontend dev server is running.'
        });
      };

      // Pass initial state to iframe when it loads
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'FACE_DEBUGGER_READY') {
          iframe.contentWindow.postMessage({
            type: 'FACE_DEBUGGER_INIT',
            state: ${JSON.stringify(initialState)}
          }, '*');
        }
      });
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Dispose the panel and clean up resources.
   */
  public dispose(): void {
    AvatarPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
