# Quick Start Guide - Testing in VS Code/Cursor

## 🚀 Quick Setup (5 minutes)

### 1. Start All Services

Open **3 terminal windows**:

**Terminal 1 - Backend:**
```bash
cd face-debugger/backend
source venv/bin/activate  # or your venv activation
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd face-debugger/frontend
npm run dev
```

**Terminal 3 - Redis (if not running):**
```bash
docker run -d --name face-debugger-redis -p 6379:6379 redis:alpine
# OR if you have Redis installed:
redis-server
```

### 2. Compile Extension

```bash
cd face-debugger/extension
npm install  # if first time
npm run compile
```

### 3. Launch in VS Code/Cursor

1. **Open the workspace** in VS Code/Cursor:
   ```bash
   code face-debugger  # or cursor face-debugger
   ```

2. **Press F5** (or Run > Start Debugging)
   - This opens a new "Extension Development Host" window
   - The extension is now active in that window

3. **In the new window:**
   - Open any code file (`.js`, `.ts`, `.py`, etc.)
   - Look at the **bottom-right status bar** for the Face Debugger icon
   - Click it to toggle watching (should show "👁 Watching")

4. **Open the Avatar Panel:**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type: `Face Debugger: Open Panel`
   - The avatar should appear in a side panel

### 4. Test It!

Create a test file with a bug:

```javascript
// test.js
function add(a, b) {
  return a + c;  // Bug: 'c' is undefined!
}
```

- Place cursor on line 2
- Wait ~8 seconds (polling interval)
- Avatar should detect the bug and show a comment! 🎉

## ✅ Verification Checklist

Before testing, verify everything is running:

```bash
# Check backend
curl http://localhost:8000/health
# Should return: {"status":"healthy","redis":true}

# Check frontend  
curl http://localhost:5173
# Should return HTML

# Check Redis
redis-cli ping
# Should return: PONG
```

## 🐛 Troubleshooting

**Avatar panel is blank?**
- Check frontend is running: `curl http://localhost:5173`
- Check browser console in panel (right-click > Inspect)
- Verify `faceDebugger.frontendUrl` in VS Code settings

**No comments appearing?**
- Check backend logs in Terminal 1
- Check VS Code Output panel (View > Output > "Face Debugger")
- Verify ANTHROPIC_API_KEY is set in `backend/.env`

**Extension not activating?**
- Check Output panel for errors
- Make sure you pressed F5 in the main VS Code window
- Verify extension compiled: `cd extension && npm run compile`

## 📝 Configuration

Edit VS Code settings (Cmd+, / Ctrl+,):

```json
{
  "faceDebugger.backendUrl": "http://localhost:8000",
  "faceDebugger.pollInterval": 8000,
  "faceDebugger.frontendUrl": "http://localhost:5173"
}
```

## 🎯 What to Expect

1. **Status Bar**: Shows "👁 Watching" when active
2. **Avatar Panel**: 3D avatar that animates when speaking
3. **Speech Bubble**: Appears with Claude's comments
4. **Polling**: Analyzes code every 8 seconds (configurable)

## 💡 Pro Tips

- **Watch mode**: Run `npm run watch` in extension folder for auto-compile
- **Hot reload**: Restart Extension Development Host (F5) after code changes
- **Debug logs**: Check Output panel > "Face Debugger" for detailed logs
- **Test different bugs**: Try undefined variables, typos, logic errors

