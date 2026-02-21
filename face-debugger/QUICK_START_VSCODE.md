# Quick Start: Testing in VS Code/Cursor

## Step-by-Step Setup

### 1. Start Backend
```bash
cd face-debugger/backend
source venv/bin/activate  # or your venv activation
uvicorn main:app --reload --port 8000
```

### 2. Start Frontend (in new terminal)
```bash
cd face-debugger/frontend
npm run dev
```

### 3. Verify Redis is Running
```bash
redis-cli ping
# Should return: PONG
```

### 4. Compile Extension
```bash
cd face-debugger/extension
npm install  # if first time
npm run compile
```

### 5. Launch Extension Development Host
1. Open `face-debugger/extension` folder in VS Code/Cursor
2. Press **F5** (or `Cmd+F5` on Mac)
3. A new window opens - this is your test environment

### 6. In the New Window
1. Open any code file (`.js`, `.ts`, `.py`, etc.)
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type: **"Face Debugger: Toggle"** → Enter
4. Type: **"Face Debugger: Open Panel"** → Enter

### 7. Test It!
Write this buggy code:
```javascript
function add(a, b) {
  return a + c;  // Bug: 'c' is undefined
}
```

The avatar should react within 8-11 seconds! 🎉

## Status Bar Indicator

Look at the bottom-right of VS Code:
- **👁 Watching** = Extension is active and polling
- **⏸ Paused** = Click to start watching

## Common Issues

**"Failed to start. Check backend connection."**
→ Make sure backend is running on port 8000

**Avatar panel shows "Loading..."**
→ Make sure frontend is running on port 5173

**No reaction to code changes**
→ Check status bar shows "👁 Watching"
→ Check extension output: `View > Output > Face Debugger`

## Commands Reference

- `Face Debugger: Toggle` - Start/stop watching code
- `Face Debugger: Open Panel` - Show/hide avatar panel

## Settings

Press `Cmd+,` and search "Face Debugger" to configure:
- Backend URL (default: `http://localhost:8000`)
- Poll Interval (default: `8000` ms)
- Frontend URL (default: `http://localhost:5173`)

