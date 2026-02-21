# Quick Diagnostic - Why Avatar Isn't Reacting

## Immediate Checks (30 seconds)

### 1. Is Extension Running?
- **Status bar** (bottom-right): Should show **👁 Watching**
- **Extension Output**: `View > Output > Face Debugger`
  - Should see: `Face Debugger: Started polling every 4000ms`
  - Should see: `Face Debugger: Polling - file: ...`

**If not running:**
- Click status bar or run: `Face Debugger: Toggle`

### 2. Is Backend Running?
```bash
curl http://localhost:8000/health
```
Should return: `{"status":"healthy","redis":true}`

**If not running:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 3. Is Frontend Running?
```bash
curl http://localhost:5173
```
Should return HTML.

**If not running:**
```bash
cd frontend
npm run dev
```

### 4. Is Redis Running?
```bash
redis-cli ping
```
Should return: `PONG`

**If not running:**
```bash
docker start face-debugger-redis
# or
docker run -d --name face-debugger-redis -p 6379:6379 redis:alpine
```

## Test the Full Flow

### Step 1: Write Buggy Code
In VS Code, create a file `test.js`:
```javascript
function add(a, b) {
  return a + c;  // Bug: 'c' is undefined
}
```

### Step 2: Check Extension Output
Should see:
```
Face Debugger: Polling - file: test.js, language: javascript
Face Debugger: Response - speak: true, line: "..."
```

### Step 3: Check Backend Terminal
Should see:
```
Analyze: content_changed=True, cursor_moved=True
Analyze: Calling Claude - file length: X
Analyze: Claude result - speak=True, line="..."
Analyze: ✅ Storing comment in Redis
```

### Step 4: Check Frontend Console
Right-click avatar panel → Inspect → Console
Should see:
```
DebugSession: Status - count: 1 (prev: 0)
DebugSession: ✅ TRIGGERING SPEECH IMMEDIATELY!
```

## Common Problems

### Problem: Extension shows "Silent (no_change)"
**Why:** Content hash check is blocking
**Fix:** Type something new or move cursor

### Problem: Backend shows "Claude API Error"
**Why:** API key issue or wrong model
**Fix:** Check `.env` has `ANTHROPIC_API_KEY` and model name

### Problem: Frontend shows count but no speech
**Why:** State not updating
**Fix:** Check debug panel - click refresh button

### Problem: Nothing in any logs
**Why:** Extension not polling
**Fix:** Check status bar shows 👁 Watching

## Run Full Test

```bash
cd face-debugger
bash test-full-flow.sh
```

This tests the entire chain and shows where it breaks.

