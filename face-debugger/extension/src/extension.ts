/**
 * Face-to-Face Debugging VS Code Extension
 *
 * Entry point that registers commands and manages the polling lifecycle.
 */

import * as vscode from "vscode";
import { Poller } from "./poller";
import { AvatarPanel } from "./panel";

let poller: Poller | null = null;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log("Face Debugger: Activating extension");

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "faceDebugger.toggle";
  updateStatusBar(false);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Initialize poller
  poller = new Poller(context);

  // Register toggle command
  const toggleCommand = vscode.commands.registerCommand(
    "faceDebugger.toggle",
    async () => {
      if (!poller) {
        vscode.window.showErrorMessage("Face Debugger: Poller not initialized");
        return;
      }

      if (poller.isRunning()) {
        poller.stop();
        updateStatusBar(false);
        vscode.window.showInformationMessage("Face Debugger: Stopped watching");
      } else {
        const success = await poller.start();
        if (success) {
          updateStatusBar(true);
          vscode.window.showInformationMessage(
            "Face Debugger: Now watching your code"
          );
        } else {
          vscode.window.showErrorMessage(
            "Face Debugger: Failed to start. Check backend connection."
          );
        }
      }
    }
  );

  // Register open panel command
  const openPanelCommand = vscode.commands.registerCommand(
    "faceDebugger.openPanel",
    async () => {
      if (!poller) {
        vscode.window.showErrorMessage("Face Debugger: Poller not initialized");
        return;
      }

      // Ensure session is started
      let sessionId = poller.getSessionId();
      if (!sessionId) {
        const success = await poller.startSession();
        if (!success) {
          vscode.window.showErrorMessage(
            "Face Debugger: Failed to create session. Check backend connection."
          );
          return;
        }
        sessionId = poller.getSessionId();
      }

      if (!sessionId) {
        vscode.window.showErrorMessage(
          "Face Debugger: No active session."
        );
        return;
      }

      // Open the avatar panel
      AvatarPanel.createOrShow(context, {
        sessionId: sessionId,
        backendUrl: poller.getBackendUrl(),
      });
    }
  );

  context.subscriptions.push(toggleCommand);
  context.subscriptions.push(openPanelCommand);

  // Listen for active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      if (poller?.isRunning()) {
        // Trigger immediate poll on editor change
        poller.pollNow();
      }
    })
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("faceDebugger")) {
        poller?.updateConfig();
      }
    })
  );
}

export function deactivate() {
  console.log("Face Debugger: Deactivating extension");

  if (poller) {
    poller.stop();
    poller = null;
  }

  if (statusBarItem) {
    statusBarItem.dispose();
  }
}

function updateStatusBar(isWatching: boolean) {
  if (isWatching) {
    statusBarItem.text = "$(eye) Watching";
    statusBarItem.tooltip = "Face Debugger: Click to pause";
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = "$(debug-pause) Paused";
    statusBarItem.tooltip = "Face Debugger: Click to start watching";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  }
}
