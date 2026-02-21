# Diagnostic Checklist - Why Comments Aren't Showing

Use this checklist to diagnose why the avatar isn't reacting to code mistakes.

## Step 1: Check Extension is Running

**In VS Code:**
1. Look at bottom-right status bar
2. Should show: **👁 Watching** (not ⏸ Paused)
3. If paused, click it or run: `Face Debugger: Toggle`

**Check Extension Output:**
1. `View > Output`
2. Select **"Face Debugger"** from dropdown
3. Should see: `Face Debugger: Started polling every 4000ms`
4. Should see periodic: `Face Debugger: Polling - file: ...`

**If you don't see polling logs:**
- Extension isn't running → Run `Face Debugger: Toggle`
- No active editor → Open a code file
- File is ignored → Check `faceDebugger.ignoredLanguages` setting

## Step 2: Check Extension is Sending Requests

**In Extension Output, look for:**
```
Face Debugger: Polling - file: test.js, language: javascript, cursor: 2
Face Debugger: Response - speak: true/false, reason: ...
```

**If you see errors:**
- `Analyze failed with status 503` → Backend not running
- `Analyze failed with status 404` → Wrong backend URL
- `Poll failed` → Network issue

**If you see "Silent (no_change)":**
- Content hash check is blocking → This is normal if you haven't changed code
- Try typing something new

**If you see "Silent (debounced)":**
- Avatar spoke recently → Wait 3 seconds
- This is normal behavior

## Step 3: Check Backend is Receiving Requests

**In Backend Terminal, look for:**
```
Analyze: content_changed=True/False, cursor_moved=True/False
Analyze: Calling Claude - file length: X, cursor: Y
Analyze: Claude result - speak=True/False
```

**If you don't see "Analyze:" logs:**
- Extension isn't sending requests → Check Step 1
- Backend not running → Start backend server

**If you see "Skipping - content unchanged":**
- Normal if code hasn't changed
- Type something new to trigger analysis

**If you see "Claude API Error":**
- Check `ANTHROPIC_API_KEY` in backend `.env`
- Check model name is correct

## Step 4: Check Claude is Detecting Bugs

**In Backend Terminal, look for:**
```
Analyze: Claude result - speak=True, line="..."
Analyze: ✅ Storing comment in Redis
```

**If `speak=False`:**
- Claude isn't detecting the bug → Check the code actually has a bug
- Try obvious bug: `return a + c;` when only `a` and `b` are defined

**If `speak=True` but no comment stored:**
- Redis issue → Check Redis is running: `redis-cli ping`

## Step 5: Check Frontend is Detecting Comments

**In Browser Console (right-click panel → Inspect), look for:**
```
DebugSession: Status - count: X (prev: Y)
DebugSession: ✅ TRIGGERING SPEECH IMMEDIATELY!
```

**If you don't see status logs:**
- Frontend not polling → Check frontend is running
- Wrong session ID → Check session ID matches

**If you see status but no trigger:**
- Check debug panel (top-right) shows comment_count increasing
- Check `isSpeaking` and `speechVisible` states

## Step 6: Quick Test

**Run the test script:**
```bash
cd face-debugger
bash test-full-flow.sh
```

This will:
1. Test backend health
2. Create a session
3. Send a test analyze request with buggy code
4. Check if comment was stored
5. Show you exactly where it's failing

## Common Issues

### Issue: Extension shows "Silent (no_change)" always
**Solution:** The content hash is preventing analysis. Try:
- Type something new
- Move cursor to different line
- Save the file
- Or temporarily disable content hash check

### Issue: Backend shows "Claude API Error"
**Solution:** 
- Check `.env` file has `ANTHROPIC_API_KEY`
- Check model name in `claude_client.py` is correct
- Check API key has credits/permissions

### Issue: Frontend shows comments in status but avatar doesn't react
**Solution:**
- Check debug panel - are `isSpeaking` and `speechVisible` true?
- Check browser console for errors
- Try clicking the refresh button in debug panel

### Issue: Nothing happens at all
**Solution:**
1. Check all services are running: `./restart-all.sh`
2. Check extension is watching: Status bar shows 👁
3. Check extension output for errors
4. Check backend terminal for errors
5. Check frontend console for errors

## Debug Commands

```bash
# Test backend directly
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test",
    "file_content": "function add(a, b) {\n  return a + c;\n}",
    "cursor_line": 2,
    "language": "javascript"
  }'

# Check if comment was stored
curl http://localhost:8000/session/test/status

# Check debug info
curl http://localhost:8000/debug/last-analysis
```

