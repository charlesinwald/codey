# Testing Face Debugger in VS Code/Cursor

This guide explains how to test the Face Debugger extension in VS Code or Cursor.

## Prerequisites

1. **Backend running** on `http://localhost:8000`
   ```bash
   cd backend
   source venv/bin/activate  # or activate your virtual environment
   uvicorn main:app --reload --port 8000
   ```

2. **Frontend running** on `http://localhost:5173`
   ```bash
   cd frontend
   npm install  # if not already done
   npm run dev
   ```

3. **Redis running** (required for backend)
   ```bash
   # Using Docker:
   docker run -d --name face-debugger-redis -p 6379:6379 redis:alpine
   
   # Or using Homebrew (macOS):
   brew services start redis
   ```

## Setup Extension for Development

1. **Install dependencies:**
   ```bash
   cd extension
   npm install
   ```

2. **Compile the extension:**
   ```bash
   npm run compile
   ```

   Or watch for changes:
   ```bash
   npm run watch
   ```

## Running in Development Mode

1. **Open the extension folder in VS Code/Cursor:**
   ```bash
   cd face-debugger/extension
   code .  # or `cursor .`
   ```

2. **Press F5** (or `Cmd+F5` on Mac) to launch a new Extension Development Host window

3. **In the new window:**
   - Open any code file (JavaScript, TypeScript, Python, etc.)
   - Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Run: **"Face Debugger: Toggle"** to start watching your code
   - Run: **"Face Debugger: Open Panel"** to open the avatar panel

## Testing the Integration

### Method 1: Write Code with Bugs

1. **Start watching:**
   - Click the status bar item (👁 Watching / ⏸ Paused) OR
   - Run command: `Face Debugger: Toggle`

2. **Open the avatar panel:**
   - Run command: `Face Debugger: Open Panel`
   - The panel should open on the right side showing the avatar

3. **Write buggy code:**
   ```javascript
   function add(a, b) {
     return a + c;  // Bug: 'c' is undefined
   }
   ```

4. **Watch for the avatar's reaction:**
   - The extension polls every 8 seconds (configurable)
   - When Claude detects a bug, the avatar should speak
   - The comment appears in a speech bubble

### Method 2: Manual Testing with Curl

While the extension is running and watching:

1. **Get the current session ID:**
   - Check the browser console in the avatar panel
   - Or check the extension's output channel: `View > Output > Face Debugger`

2. **Send a test analyze request:**
   ```bash
   curl -X POST http://localhost:8000/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "session_id": "YOUR_SESSION_ID",
       "file_content": "function add(a, b) {\n  return a + c;\n}",
       "cursor_line": 2,
       "language": "javascript"
     }'
   ```

3. **The avatar should react within 3 seconds** (frontend polls every 3 seconds)

## Configuration

You can configure the extension in VS Code settings:

1. Open Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "Face Debugger"
3. Adjust:
   - **Backend URL**: Default `http://localhost:8000`
   - **Poll Interval**: Default `8000` ms (8 seconds)
   - **Frontend URL**: Default `http://localhost:5173`
   - **Ignored Languages**: Languages to skip (default: plaintext, markdown, json)

Or edit `.vscode/settings.json`:
```json
{
  "faceDebugger.backendUrl": "http://localhost:8000",
  "faceDebugger.pollInterval": 8000,
  "faceDebugger.frontendUrl": "http://localhost:5173",
  "faceDebugger.ignoredLanguages": ["plaintext", "markdown", "json"]
}
```

## Troubleshooting

### Avatar panel shows "Loading..." forever
- **Check frontend is running:** `curl http://localhost:5173`
- **Check frontend URL in settings:** Should match your frontend dev server
- **Check browser console:** Open DevTools in the panel (right-click > Inspect)

### Status bar shows "Paused" but won't start
- **Check backend is running:** `curl http://localhost:8000/health`
- **Check Redis is running:** `redis-cli ping` (should return `PONG`)
- **Check extension output:** `View > Output > Face Debugger` for errors

### Avatar doesn't react to code changes
- **Check polling is enabled:** Status bar should show "👁 Watching"
- **Check session is active:** Avatar panel should show "Session: ..."
- **Check backend logs:** Look for analyze requests in backend terminal
- **Check Claude API key:** Make sure `ANTHROPIC_API_KEY` is set in backend `.env`

### Extension commands not appearing
- **Recompile:** Run `npm run compile` in the extension directory
- **Reload window:** `Cmd+Shift+P` > "Developer: Reload Window"
- **Check activation:** Extension activates on startup, check Output panel

## Debugging Tips

1. **Extension Output:**
   - `View > Output > Face Debugger` - See extension logs

2. **Frontend Console:**
   - Right-click in avatar panel > "Inspect"
   - Check browser console for frontend errors

3. **Backend Logs:**
   - Check terminal where backend is running
   - Look for "Claude analysis result" and "Claude raw response" logs

4. **Network Requests:**
   - Open browser DevTools > Network tab
   - Watch for requests to `/session/{id}/status` (polling)
   - Watch for requests to `/analyze` (from extension poller)

## Quick Test Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Redis running
- [ ] Extension compiled (`npm run compile`)
- [ ] Extension Development Host opened (F5)
- [ ] Status bar shows "👁 Watching"
- [ ] Avatar panel opened and showing avatar
- [ ] Wrote buggy code (undefined variable, etc.)
- [ ] Avatar reacted with comment (within 8-11 seconds)

## Next Steps

Once everything is working:
- Try different types of bugs (undefined variables, type errors, etc.)
- Adjust the poll interval for faster/slower reactions
- Customize the avatar model (see README.md)
- Integrate with your actual coding workflow
